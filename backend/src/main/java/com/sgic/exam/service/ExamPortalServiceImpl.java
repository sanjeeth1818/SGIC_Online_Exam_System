package com.sgic.exam.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sgic.exam.dto.ExamPortalQuestionResponse;
import com.sgic.exam.model.Question;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExamPortalServiceImpl implements ExamPortalService {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Override
    public Test verifyCode(String code) {
        Optional<StudentExamCode> entry = studentExamCodeRepository.findByExamCode(code);
        if (entry.isEmpty()) {
            throw new RuntimeException("Invalid examination code.");
        }

        StudentExamCode codeEntry = entry.get();
        String codeStatus = codeEntry.getStatus();

        if (!"ACTIVE".equalsIgnoreCase(codeStatus) && !"STARTED".equalsIgnoreCase(codeStatus)) {
            throw new RuntimeException("This code has already been used or has expired. Status: " + codeStatus);
        }

        // Verify Student Status for ACTIVE codes
        if ("ACTIVE".equalsIgnoreCase(codeStatus)) {
            com.sgic.exam.model.Student student = studentRepository.findById(codeEntry.getStudentId())
                    .orElseThrow(() -> new RuntimeException("Student record not found."));

            String studentStatus = student.getStatus();
            if (!"Allocated".equalsIgnoreCase(studentStatus) && !"Rescheduled".equalsIgnoreCase(studentStatus)) {
                throw new RuntimeException(
                        "Your current status (" + studentStatus + ") does not allow examination access.");
            }

            // Batch Date Validation
            validateBatchDate(codeEntry.getExpiryDate());
        }

        Test test = testRepository.findById(codeEntry.getTestId())
                .orElseThrow(() -> new RuntimeException("Associated test not found."));

        if (!"Published".equalsIgnoreCase(test.getStatus())) {
            throw new RuntimeException("The examination is not currently available.");
        }

        // Inject extra data for the portal
        if (codeEntry.getAdditionalTime() != null) {
            test.setAdditionalTime(codeEntry.getAdditionalTime());
        }
        test.setIsReopened(Boolean.TRUE.equals(codeEntry.getIsReopened()));

        return test;
    }

    @Override
    public Map<String, Object> getResumeState(String code) {
        return submissionRepository.findByExamCode(code)
                .map(submission -> {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        mapper.registerModule(new JavaTimeModule());
                        List<Map<String, Object>> breakdown = mapper.readValue(
                                submission.getDetailedBreakdownJson(),
                                new TypeReference<List<Map<String, Object>>>() {
                                });

                        Map<Long, String> answers = new HashMap<>();
                        for (Map<String, Object> item : breakdown) {
                            Object qIdObj = item.get("questionId");
                            if (qIdObj != null) {
                                Long qId = Long.valueOf(qIdObj.toString());
                                String ans = (String) item.get("studentAnswer");
                                answers.put(qId, ans);
                            }
                        }
                        return Map.of("answers", (Object) answers);
                    } catch (Exception e) {
                        return Map.of("answers", (Object) new HashMap<>());
                    }
                })
                .orElse(Map.of("answers", new HashMap<>()));
    }

    @Override
    @Transactional
    public List<ExamPortalQuestionResponse> getQuestionsForTest(String code) {
        StudentExamCode entry = studentExamCodeRepository.findByExamCode(code)
                .orElseThrow(() -> new RuntimeException("Invalid code."));

        Test test = testRepository.findById(entry.getTestId())
                .orElseThrow(() -> new RuntimeException("Test not found."));

        List<Question> allSelectedQuestions;

        // 1. Check for persistent questions
        if (entry.getAssignedQuestionIds() != null && !entry.getAssignedQuestionIds().isEmpty()) {
            String[] ids = entry.getAssignedQuestionIds().split(",");
            allSelectedQuestions = Arrays.stream(ids)
                    .filter(sId -> !sId.trim().isEmpty())
                    .map(sId -> Long.valueOf(sId.trim()))
                    .map(qid -> questionRepository.findById(qid).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            // 2. Generate new set
            allSelectedQuestions = generateQuestionSet(test);

            // Save for persistence
            String idList = allSelectedQuestions.stream()
                    .map(q -> q.getId().toString())
                    .collect(Collectors.joining(","));
            entry.setAssignedQuestionIds(idList);
            studentExamCodeRepository.save(entry);
        }

        // 3. Anonymize and randomize options
        return sanitizeQuestions(allSelectedQuestions);
    }

    private void validateBatchDate(String batchDateStr) {
        if (batchDateStr != null && !batchDateStr.isEmpty() && !"TBD".equalsIgnoreCase(batchDateStr)) {
            try {
                LocalDate batchDate = LocalDate.parse(batchDateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                LocalDate today = LocalDate.now();
                if (today.isBefore(batchDate)) {
                    throw new RuntimeException(
                            "Your examination is scheduled for " + batchDateStr + ". Please come back then.");
                } else if (today.isAfter(batchDate)) {
                    throw new RuntimeException("Your examination access for " + batchDateStr + " has expired.");
                }
            } catch (Exception e) {
                if (e instanceof RuntimeException)
                    throw e;
                System.err.println("Batch date format error: " + batchDateStr);
            }
        }
    }

    private List<Question> generateQuestionSet(Test test) {
        List<Question> allSelectedQuestions = new ArrayList<>();
        SecureRandom secureRandom = new SecureRandom();

        if ("manual".equalsIgnoreCase(test.getSelectionMode())) {
            List<Question> manualPool = test.getManualQuestions().stream()
                    .filter(q -> !"Inactive".equalsIgnoreCase(q.getStatus()))
                    .collect(Collectors.toList());
            Collections.shuffle(manualPool, secureRandom);
            allSelectedQuestions.addAll(manualPool);
        } else {
            for (TestCategoryConfig config : test.getCategoryConfigs()) {
                List<Question> pool = questionRepository.findByCategoryId(config.getCategoryId())
                        .stream()
                        .filter(q -> !"Inactive".equalsIgnoreCase(q.getStatus()))
                        .collect(Collectors.toList());

                int needed = Math.min(config.getQuestionCount(), pool.size());
                if (needed <= 0)
                    continue;

                Collections.shuffle(pool, secureRandom);

                if (needed >= pool.size()) {
                    allSelectedQuestions.addAll(pool);
                } else {
                    List<Question> picked = pickStratifiedQuestions(pool, needed, secureRandom);
                    allSelectedQuestions.addAll(picked);
                }
            }
        }
        Collections.shuffle(allSelectedQuestions, secureRandom);
        return allSelectedQuestions;
    }

    private List<Question> pickStratifiedQuestions(List<Question> pool, int needed, SecureRandom random) {
        List<Question> picked = new ArrayList<>();
        int poolSize = pool.size();
        boolean[] used = new boolean[poolSize];
        double goldenRatio = (1.0 + Math.sqrt(5.0)) / 2.0;
        int startOffset = random.nextInt(poolSize);

        for (int i = 0; i < needed; i++) {
            int index = (int) ((startOffset + Math.round(i * goldenRatio * poolSize / needed)) % poolSize);
            int attempts = 0;
            while (used[index] && attempts < poolSize) {
                index = (index + 1) % poolSize;
                attempts++;
            }
            if (!used[index]) {
                used[index] = true;
                picked.add(pool.get(index));
            }
        }
        Collections.shuffle(picked, random);
        return picked;
    }

    private List<ExamPortalQuestionResponse> sanitizeQuestions(List<Question> questions) {
        SecureRandom optionRandom = new SecureRandom();
        return questions.stream().map(q -> {
            ExamPortalQuestionResponse dto = new ExamPortalQuestionResponse();
            dto.setId(q.getId());
            dto.setText(q.getText());
            dto.setType(q.getType());
            dto.setCategoryName(q.getCategory() != null ? q.getCategory().getName() : "General");

            if ("MCQ".equalsIgnoreCase(q.getType()) && q.getOptions() != null) {
                List<String> shuffledOptions = new ArrayList<>(q.getOptions());
                Collections.shuffle(shuffledOptions, optionRandom);
                dto.setOptions(shuffledOptions);
            } else {
                dto.setOptions(q.getOptions());
            }
            return dto;
        }).collect(Collectors.toList());
    }
}
