package com.sgic.exam.service;

import com.sgic.exam.dto.PasswordChangeRequest;
import com.sgic.exam.dto.ProfileUpdateRequest;
import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Map<String, Object> getProfile(String username) {
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return Map.of(
                "id", admin.getId(),
                "username", admin.getUsername(),
                "email", admin.getEmail() != null ? admin.getEmail() : "",
                "name", admin.getName() != null ? admin.getName() : "System Admin");
    }

    @Override
    @Transactional
    public Map<String, Object> updateProfile(String currentUsername, ProfileUpdateRequest request) {
        Admin admin = adminRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty");
        }

        if (!currentUsername.equals(request.getUsername())) {
            if (adminRepository.findByUsername(request.getUsername()).isPresent()) {
                throw new IllegalArgumentException("Username is already taken");
            }
        }

        admin.setUsername(request.getUsername());

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            admin.setName(request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            Optional<Admin> existingEmail = adminRepository.findByEmail(request.getEmail());
            if (existingEmail.isPresent() && !existingEmail.get().getId().equals(admin.getId())) {
                throw new IllegalArgumentException("Email is already taken");
            }
            admin.setEmail(request.getEmail());
        }

        Admin saved = adminRepository.save(admin);

        return Map.of(
                "message", "Profile updated successfully",
                "admin", Map.of(
                        "id", saved.getId(),
                        "username", saved.getUsername(),
                        "email", saved.getEmail() != null ? saved.getEmail() : "",
                        "name", saved.getName() != null ? saved.getName() : ""));
    }

    @Override
    @Transactional
    public void changePassword(String username, PasswordChangeRequest request) {
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (!checkPassword(request.getCurrentPassword(), admin.getPassword())) {
            throw new IllegalArgumentException("Incorrect current password");
        }

        admin.setPassword(passwordEncoder.encode(request.getNewPassword()));
        adminRepository.save(admin);
    }

    @Override
    public boolean verifyPassword(String username, String password) {
        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        return checkPassword(password, admin.getPassword());
    }

    private boolean checkPassword(String raw, String stored) {
        // Handle BCrypt
        try {
            if (passwordEncoder.matches(raw, stored))
                return true;
        } catch (Exception ignored) {
        }

        // Fallback for legacy plain text passwords
        return raw.equals(stored);
    }
}
