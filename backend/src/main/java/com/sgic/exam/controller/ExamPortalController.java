package com.sgic.exam.controller;

import com.sgic.exam.model.Question;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.SubmissionRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exam-portal")
public class ExamPortalController {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @GetMapping("/verify/{code}")
    public ResponseEntity<?> verifyCode(@PathVariable String code) {
        Optional<Test> testOpt = Optional.empty();

        // 1. Try 4-digit code first
        Optional<StudentExamCode> entry = studentExamCodeRepository.findByExamCode(code);
        if (entry.isPresent()) {
            String status = entry.get().getStatus();
            if (!"ACTIVE".equalsIgnoreCase(status) && !"STARTED".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "This code has already been used or has expired. Status: " + status));
            }
            testOpt = testRepository.findById(entry.get().getTestId());
        }
        // 2. Fallback removed (was testCode lookup)

        return testOpt.map(test -> {
            if (!"Published".equals(test.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Test is not active."));
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
                    .map(qid -> questionRepository.findById(qid).orElse(null))
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
        } else {
            // Generate for the first time
            if ("manual".equalsIgnoreCase(test.getSelectionMode())) {
                allSelectedQuestions.addAll(test.getManualQuestions());
            } else {
                for (TestCategoryConfig config : test.getCategoryConfigs()) {
                    List<Question> categoryQuestions = questionRepository.findByCategoryId(config.getCategoryId());
                    Collections.shuffle(categoryQuestions);

                    int limit = Math.min(config.getQuestionCount(), categoryQuestions.size());
                    allSelectedQuestions.addAll(categoryQuestions.subList(0, limit));
                }
            }
            Collections.shuffle(allSelectedQuestions);

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

        // Hide correct answers before sending to student!
        List<Question> questionsWithoutAnswers = allSelectedQuestions.stream().map(q -> {
            Question dto = new Question();
            dto.setId(q.getId());
            dto.setText(q.getText());
            dto.setType(q.getType());
            dto.setOptions(q.getOptions());
            dto.setCategory(q.getCategory());
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(questionsWithoutAnswers);
    }
}
