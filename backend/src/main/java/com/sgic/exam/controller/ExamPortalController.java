package com.sgic.exam.controller;

import com.sgic.exam.model.Question;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
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
            if (!"ACTIVE".equalsIgnoreCase(entry.get().getStatus())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "This code has already been used or has expired."));
            }
            testOpt = testRepository.findById(entry.get().getTestId());
        }
        // 2. Fallback removed (was testCode lookup)

        return testOpt.map(test -> {
            if (!"Published".equals(test.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Test is not active."));
            }
            return ResponseEntity.ok(test);
        }).orElse(ResponseEntity.notFound().build());
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

        for (TestCategoryConfig config : test.getCategoryConfigs()) {
            List<Question> categoryQuestions = questionRepository.findByCategoryId(config.getCategoryId());
            Collections.shuffle(categoryQuestions);

            int limit = Math.min(config.getQuestionCount(), categoryQuestions.size());
            allSelectedQuestions.addAll(categoryQuestions.subList(0, limit));
        }

        Collections.shuffle(allSelectedQuestions);

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
