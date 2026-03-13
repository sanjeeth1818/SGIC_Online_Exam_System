package com.sgic.exam.controller;

import com.sgic.exam.model.Question;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.StudentRepository;
import com.sgic.exam.repository.SubmissionRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Objects;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/exam-portal")
public class ExamPortalController {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private StudentRepository studentRepository;

    @GetMapping("/verify/{code}")
    public ResponseEntity<?> verifyCode(@PathVariable String code) {
        Optional<Test> testOpt = Optional.empty();

        // 1. Try 4-digit code first
        Optional<StudentExamCode> entry = studentExamCodeRepository.findByExamCode(code);
        if (entry.isPresent()) {
            StudentExamCode codeEntry = entry.get();
            String codeStatus = codeEntry.getStatus();
            if (!"ACTIVE".equalsIgnoreCase(codeStatus) && !"STARTED".equalsIgnoreCase(codeStatus)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message",
                                "This code has already been used or has expired. Status: " + codeStatus));
            }

            // Verify Student Status - only enforce for ACTIVE codes (pre-start)
            // Skip this check for STARTED codes since the student is already mid-exam
            if ("ACTIVE".equalsIgnoreCase(codeStatus)) {
                Optional<com.sgic.exam.model.Student> studentOpt = studentRepository.findById(codeEntry.getStudentId());
                if (studentOpt.isPresent()) {
                    String studentStatus = studentOpt.get().getStatus();
                    if (!"Allocated".equalsIgnoreCase(studentStatus)
                            && !"Rescheduled".equalsIgnoreCase(studentStatus)) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("message",
                                        "Your current status (" + studentStatus
                                                + ") does not allow examination access."));
                    }

                    // --- BATCH DATE VALIDATION ---
                    String batchDateStr = codeEntry.getExpiryDate();
                    if (batchDateStr != null && !batchDateStr.isEmpty() && !"TBD".equalsIgnoreCase(batchDateStr)) {
                        try {
                            LocalDate batchDate = LocalDate.parse(batchDateStr,
                                    DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                            LocalDate today = LocalDate.now();
                            if (today.isBefore(batchDate)) {
                                return ResponseEntity.badRequest()
                                        .body(Map.of("message", "Your examination is scheduled for " + batchDateStr
                                                + ". Please come back then."));
                            } else if (today.isAfter(batchDate)) {
                                return ResponseEntity.badRequest().body(Map.of("message",
                                        "Your examination access for " + batchDateStr + " has expired."));
                            }
                        } catch (Exception e) {
                            System.err.println("Search format error for batch date: " + batchDateStr);
                        }
                    }
                    // -----------------------------
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "Student record not found."));
                }
            }

            testOpt = testRepository.findById(codeEntry.getTestId());
        }
        // 2. Fallback removed (was testCode lookup)

        return testOpt.map(test -> {
            if (!"Published".equalsIgnoreCase(test.getStatus())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "The examination is not currently available."));
            }

            if (entry.isPresent()) {
                if (entry.get().getAdditionalTime() != null) {
                    test.setAdditionalTime(entry.get().getAdditionalTime());
                }
                test.setIsReopened(Boolean.TRUE.equals(entry.get().getIsReopened()));
            }
            return ResponseEntity.ok(test);
        }).orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private SubmissionRepository submissionRepository;

    @GetMapping("/resume-state/{code}")
    public ResponseEntity<?> getResumeState(@PathVariable String code) {
        return submissionRepository.findByExamCode(code)
                .map(submission -> {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                        List<Map<String, Object>> breakdown = mapper.readValue(
                                submission.getDetailedBreakdownJson(),
                                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {
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
                        return ResponseEntity.ok(Map.of("answers", answers));
                    } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.ok(Map.of("answers", new HashMap<>()));
                    }
                })
                .orElse(ResponseEntity.ok(Map.of("answers", new HashMap<>())));
    }

    @GetMapping("/questions/{code}")
    public ResponseEntity<List<Question>> getQuestionsForTest(@PathVariable String code) {
        Optional<Test> testOpt = Optional.empty();

        // 1. Try 4-digit code
        Optional<StudentExamCode> entry = studentExamCodeRepository.findByExamCode(code);
        if (entry.isPresent()) {
            testOpt = testRepository.findById(entry.get().getTestId());
        }
        // 2. Fallback removed

        Test test = testOpt.orElseThrow(() -> new RuntimeException("Test not found for code: " + code));

        List<Question> allSelectedQuestions = new ArrayList<>();

        // Check for persistent questions first
        if (entry.isPresent() && entry.get().getAssignedQuestionIds() != null
                && !entry.get().getAssignedQuestionIds().isEmpty()) {
            String[] ids = entry.get().getAssignedQuestionIds().split(",");
            List<Long> questionIds = new ArrayList<>();
            for (String sId : ids) {
                if (!sId.trim().isEmpty()) {
                    questionIds.add(Long.valueOf(sId.trim()));
                }
            }
            // Fetch in exact order if possible, or just fetch all
            allSelectedQuestions = questionIds.stream()
                    .map(qid -> questionRepository.findById(Objects.requireNonNull(qid)).orElse(null))
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            // Generate for the first time using advanced randomization
            SecureRandom secureRandom = new SecureRandom();

            if ("manual".equalsIgnoreCase(test.getSelectionMode())) {
                // For manual mode, only include Active questions
                List<Question> manualPool = test.getManualQuestions().stream()
                        .filter(q -> !"Inactive".equalsIgnoreCase(q.getStatus()))
                        .collect(Collectors.toList());
                Collections.shuffle(manualPool, secureRandom);
                allSelectedQuestions.addAll(manualPool);
            } else {
                // STRATIFIED STRIDE-BASED SAMPLING for category-random mode
                for (TestCategoryConfig config : test.getCategoryConfigs()) {
                    List<Question> pool = questionRepository.findByCategoryId(config.getCategoryId())
                            .stream()
                            .filter(q -> !"Inactive".equalsIgnoreCase(q.getStatus()))
                            .collect(Collectors.toList());

                    int needed = Math.min(config.getQuestionCount(), pool.size());
                    if (needed <= 0)
                        continue;

                    // Step 1: Full shuffle with SecureRandom for base randomness
                    Collections.shuffle(pool, secureRandom);

                    if (needed >= pool.size()) {
                        // Need all questions, just add the shuffled pool
                        allSelectedQuestions.addAll(pool);
                    } else {
                        // Step 2: Stratified stride-based pick from across the entire pool
                        // Divide pool into zones and pick from alternating positions
                        List<Question> picked = new ArrayList<>();
                        boolean[] used = new boolean[pool.size()];
                        int poolSize = pool.size();

                        // Use a varying stride to pick from different zones
                        // Golden ratio stride ensures maximum spread across the pool
                        double goldenRatio = (1.0 + Math.sqrt(5.0)) / 2.0;
                        int startOffset = secureRandom.nextInt(poolSize);

                        for (int i = 0; i < needed; i++) {
                            int index = (int) ((startOffset + Math.round(i * goldenRatio * poolSize / needed))
                                    % poolSize);
                            // Find nearest unused slot
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

                        // Final shuffle of the picked subset for extra randomness
                        Collections.shuffle(picked, secureRandom);
                        allSelectedQuestions.addAll(picked);
                    }
                }
            }
            // Final deep shuffle of all selected questions
            Collections.shuffle(allSelectedQuestions, secureRandom);

            // SAVE the generated IDs to the student code entry for persistence
            if (entry.isPresent()) {
                String idList = allSelectedQuestions.stream()
                        .map(q -> q.getId().toString())
                        .collect(Collectors.joining(","));
                StudentExamCode studentCode = entry.get();
                studentCode.setAssignedQuestionIds(idList);
                studentExamCodeRepository.save(studentCode);
            }
        }

        // Hide correct answers and SHUFFLE MCQ options before sending to student!
        SecureRandom optionRandom = new SecureRandom();
        List<Question> questionsWithoutAnswers = allSelectedQuestions.stream().map(q -> {
            Question dto = new Question();
            dto.setId(q.getId());
            dto.setText(q.getText());
            dto.setType(q.getType());
            dto.setCategory(q.getCategory());

            // Shuffle MCQ options so A/B/C/D positions are randomized per student
            if ("MCQ".equalsIgnoreCase(q.getType()) && q.getOptions() != null && !q.getOptions().isEmpty()) {
                List<String> shuffledOptions = new ArrayList<>(q.getOptions());
                Collections.shuffle(shuffledOptions, optionRandom);
                dto.setOptions(shuffledOptions);
            } else {
                dto.setOptions(q.getOptions());
            }

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(questionsWithoutAnswers);
    }
}
