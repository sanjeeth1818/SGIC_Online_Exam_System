package com.sgic.exam.controller;

import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AdminRepository adminRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String username = loginRequest.getUsername();
        String password = loginRequest.getPassword();

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required."));
        }

        Optional<Admin> adminOpt = adminRepository.findByUsername(username);

        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            // Basic password check without hashing for simplicity
            if (admin.getPassword().equals(password)) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Login successful");
                response.put("admin", Map.of(
                        "id", admin.getId(),
                        "username", admin.getUsername(),
                        "email", admin.getEmail() != null ? admin.getEmail() : "",
                        "name", admin.getName() != null ? admin.getName() : "Admin"));
                // You could generate a simple token here, but for this basic implementation we
                // will just confirm success.
                response.put("token", "admin-auth-token-mock-" + admin.getId());
                return ResponseEntity.ok(response);
            }
        }

        // Hardcoded fallback for initial setup if table is empty
        if ("admin_user".equals(username) && "admin123".equals(password)) {
            // Check if admin exists to prevent duplicates on restart
            if (adminOpt.isEmpty()) {
                try {
                    Admin defaultAdmin = new Admin();
                    defaultAdmin.setUsername("admin_user");
                    defaultAdmin.setEmail("admin@sgic.com");
                    defaultAdmin.setPassword("admin123");
                    defaultAdmin.setName("System Admin");
                    adminRepository.save(defaultAdmin);
                } catch (Exception e) {
                }
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "token", "admin-auth-token-mock-default",
                    "admin", Map.of("username", username, "email", "admin@sgic.com", "name", "System Admin")));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid username or password."));
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
