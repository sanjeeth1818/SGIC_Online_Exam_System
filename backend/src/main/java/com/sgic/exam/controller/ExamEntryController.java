package com.sgic.exam.controller;

import com.sgic.exam.dto.ExamCompleteRequest;
import com.sgic.exam.dto.ExamEntryResponse;
import com.sgic.exam.dto.ExamEntryValidationRequest;
import com.sgic.exam.dto.ExamStartRequest;
import com.sgic.exam.service.ExamEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/exam-entry")
public class ExamEntryController {

    @Autowired
    private ExamEntryService examEntryService;

    @PostMapping("/validate")
    public ResponseEntity<ExamEntryResponse> validateCode(@RequestBody ExamEntryValidationRequest request) {
        return ResponseEntity.ok(examEntryService.validateCode(request));
    }

    @PostMapping("/start")
    public ResponseEntity<?> startExam(@RequestBody ExamStartRequest request) {
        try {
            return ResponseEntity.ok(examEntryService.startExam(request));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> completeExam(@RequestBody ExamCompleteRequest request) {
        examEntryService.completeExam(request);
        return ResponseEntity.ok(Map.of("success", true, "message", "Exam marked as completed. Code expired."));
    }
}
