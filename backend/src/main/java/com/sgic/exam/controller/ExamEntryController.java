package com.sgic.exam.controller;

import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/exam-entry")
public class ExamEntryController {

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private TestRepository testRepository;

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateCode(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        Map<String, Object> response = new HashMap<>();

        if (code == null || code.length() != 4) {
            response.put("success", false);
            response.put("message", "Invalid 4-digit code format.");
            return ResponseEntity.ok(response);
        }

        StudentExamCode entry = studentExamCodeRepository.findByExamCode(code)
                .orElse(null);

        if (entry == null) {
            response.put("success", false);
            response.put("message", "Invalid Examination Code.");
            return ResponseEntity.ok(response);
        }

        String requestToken = request.get("sessionToken");
        if ("STARTED".equalsIgnoreCase(entry.getStatus()) && !Boolean.TRUE.equals(entry.getIsReopened())) {
            if (entry.getCurrentSessionToken() != null && !entry.getCurrentSessionToken().equals(requestToken)) {
                response.put("success", false);
                response.put("message", "This exam is already in progress in another browser or tab.");
                return ResponseEntity.ok(response);
            }
        }

        if ("USED".equalsIgnoreCase(entry.getStatus()) || "EXPIRED".equalsIgnoreCase(entry.getStatus())) {
            response.put("success", false);
            response.put("message", "This code has already been used or has expired.");
            return ResponseEntity.ok(response);
        }

        Test test = testRepository.findById(Objects.requireNonNull(entry.getTestId())).orElse(null);

        if (test == null || !"Published".equalsIgnoreCase(test.getStatus())) {
            response.put("success", false);
            response.put("message", "The examination is not currently available.");
            return ResponseEntity.ok(response);
        }

        response.put("success", true);
        response.put("testId", test.getId());
        response.put("testName", test.getName());
        response.put("studentId", entry.getStudentId());
        response.put("additionalTime", entry.getAdditionalTime() != null ? entry.getAdditionalTime() : 0);
        response.put("startedAt", entry.getStartedAt());
        response.put("status", entry.getStatus());
        response.put("isReopened", Boolean.TRUE.equals(entry.getIsReopened()));
        response.put("message", "Code valid. You may start the exam.");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startExam(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        String code = (String) request.get("code");
        Long studentId = Long.valueOf(request.get("studentId").toString());
        String requestToken = (String) request.get("sessionToken");

        StudentExamCode entry = studentExamCodeRepository.findByExamCode(code).orElse(null);
        if (entry == null) {
            response.put("success", false);
            response.put("message", "Invalid Code.");
            return ResponseEntity.ok(response);
        }

        if ("USED".equalsIgnoreCase(entry.getStatus())) {
            response.put("success", false);
            response.put("message", "Exam already submitted.");
            return ResponseEntity.ok(response);
        }

        if ("STARTED".equalsIgnoreCase(entry.getStatus())) {
            if (!entry.getStudentId().equals(studentId)) {
                response.put("success", false);
                response.put("message", "This exam is already in progress on another device/session.");
                return ResponseEntity.ok(response);
            }

            // SESSION LOCK CHECK
            if (entry.getCurrentSessionToken() != null && !entry.getCurrentSessionToken().equals(requestToken)) {
                response.put("success", false);
                response.put("message", "This exam is already in progress in another browser or tab.");
                return ResponseEntity.ok(response);
            }

            // Allow re-entry for the same student/session
            response.put("success", true);
            response.put("startedAt", entry.getStartedAt());
            response.put("sessionToken", entry.getCurrentSessionToken());
            return ResponseEntity.ok(response);
        }

        // Fresh Start
        String newToken = java.util.UUID.randomUUID().toString();
        entry.setStatus("STARTED");
        entry.setStartedAt(LocalDateTime.now());
        entry.setCurrentSessionToken(newToken);
        studentExamCodeRepository.save(entry);

        response.put("success", true);
        response.put("startedAt", entry.getStartedAt());
        response.put("sessionToken", newToken);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> completeExam(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        String code = (String) request.get("code");

        if (code != null) {
            studentExamCodeRepository.findByExamCode(code).ifPresent(entry -> {
                entry.setStatus("USED");
                studentExamCodeRepository.save(entry);
            });
        } else if (request.containsKey("testId") && request.containsKey("studentId")) {
            Long testId = Long.valueOf(request.get("testId").toString());
            Long studentId = Long.valueOf(request.get("studentId").toString());
            studentExamCodeRepository.findByTestIdAndStudentId(testId, studentId).ifPresent(entry -> {
                entry.setStatus("USED");
                studentExamCodeRepository.save(entry);
            });
        }

        response.put("success", true);
        response.put("message", "Exam marked as completed. Code expired.");
        return ResponseEntity.ok(response);
    }
}
