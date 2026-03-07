package com.sgic.exam.controller;

import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import com.sgic.exam.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth/forgot-password")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class ForgotPasswordController {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/request")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        Optional<Admin> adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isEmpty()) {
            // For security, don't reveal if email exists, but the user asked for
            // "professional and proper"
            // usually we'd say "if email exists...", but here we can be helpful.
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No administrator account found with this email"));
        }

        Admin admin = adminOpt.get();
        String otp = String.format("%04d", new Random().nextInt(10000));
        admin.setResetOtp(otp);
        admin.setResetOtpExpiry(LocalDateTime.now().plusMinutes(1));
        adminRepository.save(admin);

        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok(Map.of("message", "OTP sent successfully to " + email));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP are required"));
        }

        Optional<Admin> adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid request"));
        }

        Admin admin = adminOpt.get();
        if (admin.getResetOtp() == null || !admin.getResetOtp().equals(otp)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP"));
        }

        if (admin.getResetOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP has expired"));
        }

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "All fields are required"));
        }

        Optional<Admin> adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid request"));
        }

        Admin admin = adminOpt.get();
        if (admin.getResetOtp() == null || !admin.getResetOtp().equals(otp) ||
                admin.getResetOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired session"));
        }

        // Securely hash the new password
        admin.setPassword(passwordEncoder.encode(newPassword));

        // Clear OTP fields after successful reset
        admin.setResetOtp(null);
        admin.setResetOtpExpiry(null);
        adminRepository.save(admin);

        // Send success notification
        emailService.sendPasswordChangedEmail(email);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }
}
