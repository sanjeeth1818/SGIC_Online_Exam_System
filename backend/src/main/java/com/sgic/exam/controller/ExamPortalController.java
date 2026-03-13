package com.sgic.exam.controller;

import com.sgic.exam.dto.ExamPortalQuestionResponse;
import com.sgic.exam.model.Test;
import com.sgic.exam.service.ExamPortalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-portal")
public class ExamPortalController {

    @Autowired
    private ExamPortalService examPortalService;

    @GetMapping("/verify/{code}")
    public ResponseEntity<?> verifyCode(@PathVariable String code) {
        try {
            Test test = examPortalService.verifyCode(code);
            return ResponseEntity.ok(test);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/resume-state/{code}")
    public ResponseEntity<?> getResumeState(@PathVariable String code) {
        return ResponseEntity.ok(examPortalService.getResumeState(code));
    }

    @GetMapping("/questions/{code}")
    public ResponseEntity<?> getQuestionsForTest(@PathVariable String code) {
        try {
            List<ExamPortalQuestionResponse> questions = examPortalService.getQuestionsForTest(code);
            return ResponseEntity.ok(questions);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
