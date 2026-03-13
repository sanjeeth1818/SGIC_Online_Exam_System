package com.sgic.exam.controller;

import com.sgic.exam.dto.SubmissionRequest;
import com.sgic.exam.dto.SubmissionResponse;
import com.sgic.exam.model.Submission;
import com.sgic.exam.service.SubmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired
    private SubmissionService submissionService;

    @GetMapping
    public ResponseEntity<List<Submission>> getAllSubmissions() {
        return ResponseEntity.ok(submissionService.getAllSubmissions());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(submissionService.getSubmissionStats());
    }

    @PostMapping
    public ResponseEntity<?> submitTest(@RequestBody SubmissionRequest request) {
        try {
            if (request.getExamCode() == null || request.getExamCode().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Examination code is required");
            }
            SubmissionResponse response = submissionService.processSubmission(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal Error: " + e.getMessage());
        }
    }
}
