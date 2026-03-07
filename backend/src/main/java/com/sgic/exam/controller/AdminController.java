package com.sgic.exam.controller;

import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminRepository adminRepository;

    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        Optional<Admin> adminOpt = adminRepository.findByUsername(username);

        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            return ResponseEntity.ok(Map.of(
                    "id", admin.getId(),
                    "username", admin.getUsername(),
                    "email", admin.getEmail(),
                    "name", admin.getName() != null ? admin.getName() : "System Admin"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Admin not found"));
    }

    @PutMapping("/profile/{currentUsername}")
    public ResponseEntity<?> updateProfile(@PathVariable String currentUsername,
            @RequestBody ProfileUpdateRequest request) {
        Optional<Admin> adminOpt = adminRepository.findByUsername(currentUsername);

        if (adminOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Admin not found"));
        }

        Admin admin = adminOpt.get();

        // Prevent setting an empty username
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username cannot be empty"));
        }

        // Check if new username is already taken by a different admin
        if (!currentUsername.equals(request.getUsername())) {
            Optional<Admin> existing = adminRepository.findByUsername(request.getUsername());
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username is already taken"));
            }
        }

        admin.setUsername(request.getUsername());

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            admin.setName(request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            // Check if email is already taken
            if (admin.getEmail() == null || !admin.getEmail().equals(request.getEmail())) {
                Optional<Admin> existingEmailOpt = adminRepository.findByEmail(request.getEmail());
                if (existingEmailOpt.isPresent() && !existingEmailOpt.get().getId().equals(admin.getId())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Email is already taken"));
                }
            }
            admin.setEmail(request.getEmail());
        }

        adminRepository.save(admin);

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully",
                "admin", Map.of(
                        "id", admin.getId(),
                        "username", admin.getUsername(),
                        "email", admin.getEmail(),
                        "name", admin.getName())));
    }

    @PostMapping("/change-password/{username}")
    public ResponseEntity<?> changePassword(@PathVariable String username,
            @RequestBody PasswordChangeRequest request) {
        Optional<Admin> adminOpt = adminRepository.findByUsername(username);

        if (adminOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Admin not found"));
        }

        Admin admin = adminOpt.get();

        // Verify current password
        if (!admin.getPassword().equals(request.getCurrentPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Incorrect current password"));
        }

        // Update with new password
        admin.setPassword(request.getNewPassword());
        adminRepository.save(admin);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    public static class ProfileUpdateRequest {
        private String username;
        private String name;
        private String email;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    public static class PasswordChangeRequest {
        private String currentPassword;
        private String newPassword;

        public String getCurrentPassword() {
            return currentPassword;
        }

        public void setCurrentPassword(String currentPassword) {
            this.currentPassword = currentPassword;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }
}
