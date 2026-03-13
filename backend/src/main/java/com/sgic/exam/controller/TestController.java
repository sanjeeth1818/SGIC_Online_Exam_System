package com.sgic.exam.controller;

import com.sgic.exam.dto.TestRequest;
import com.sgic.exam.dto.TestResponse;
import com.sgic.exam.service.TestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tests")
public class TestController {

    @Autowired
    private TestService testService;

    @GetMapping("/{id}/student-codes")
    public ResponseEntity<?> getStudentCodes(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(testService.getStudentCodes(id));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Error fetching student codes: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/add-time")
    public ResponseEntity<?> addExtraTime(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(testService.addExtraTime(id, payload));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("message", "Error adding extra time: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<TestResponse>> getAllTests() {
        return ResponseEntity.ok(testService.getAllTests());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TestResponse> getTestById(@PathVariable Long id) {
        return ResponseEntity.ok(testService.getTestById(id));
    }

    @PostMapping
    public ResponseEntity<TestResponse> createTest(@Valid @RequestBody TestRequest testRequest) {
        return ResponseEntity.ok(testService.createTest(testRequest));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TestResponse> updateTest(@PathVariable Long id, @Valid @RequestBody TestRequest testRequest) {
        return ResponseEntity.ok(testService.updateTest(id, testRequest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTest(@PathVariable Long id) {
        testService.deleteTest(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TestResponse> updateStatus(@PathVariable Long id, @RequestBody String status) {
        return ResponseEntity.ok(testService.updateStatus(id, status));
    }
}
