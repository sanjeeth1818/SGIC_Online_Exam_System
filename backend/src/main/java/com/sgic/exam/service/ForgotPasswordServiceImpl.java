package com.sgic.exam.service;

import com.sgic.exam.dto.ForgotPasswordRequest;
import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class ForgotPasswordServiceImpl implements ForgotPasswordService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void requestOtp(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No administrator account found with this email"));

        String otp = String.format("%04d", new Random().nextInt(10000));
        admin.setResetOtp(otp);
        admin.setResetOtpExpiry(LocalDateTime.now().plusMinutes(1));
        adminRepository.save(admin);

        emailService.sendOtpEmail(email, otp);
    }

    @Override
    public void verifyOtp(String email, String otp) {
        if (email == null || otp == null) {
            throw new IllegalArgumentException("Email and OTP are required");
        }

        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid request"));

        if (admin.getResetOtp() == null || !admin.getResetOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (admin.getResetOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired");
        }
    }

    @Override
    @Transactional
    public void resetPassword(ForgotPasswordRequest request) {
        if (request.getEmail() == null || request.getOtp() == null || request.getNewPassword() == null) {
            throw new IllegalArgumentException("All fields are required");
        }

        Admin admin = adminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid request"));

        if (admin.getResetOtp() == null
                || !admin.getResetOtp().equals(request.getOtp())
                || admin.getResetOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invalid or expired session");
        }

        admin.setPassword(passwordEncoder.encode(request.getNewPassword()));
        admin.setResetOtp(null);
        admin.setResetOtpExpiry(null);
        adminRepository.save(admin);

        emailService.sendPasswordChangedEmail(request.getEmail());
    }
}
