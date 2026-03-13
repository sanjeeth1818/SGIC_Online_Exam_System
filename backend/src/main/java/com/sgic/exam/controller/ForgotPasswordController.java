package com.sgic.exam.controller;

import com.sgic.exam.dto.ForgotPasswordRequest;
import com.sgic.exam.service.ForgotPasswordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/forgot-password")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class ForgotPasswordController {

    @Autowired
    private ForgotPasswordService forgotPasswordService;

    @PostMapping("/request")
    public ResponseEntity<?> requestOtp(@RequestBody ForgotPasswordRequest request) {
        try {
            forgotPasswordService.requestOtp(request.getEmail());
            return ResponseEntity.ok(Map.of("message", "OTP sent successfully to " + request.getEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody ForgotPasswordRequest request) {
        try {
            forgotPasswordService.verifyOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            forgotPasswordService.resetPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
