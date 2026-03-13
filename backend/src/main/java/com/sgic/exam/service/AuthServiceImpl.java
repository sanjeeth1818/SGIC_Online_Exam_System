package com.sgic.exam.service;

import com.sgic.exam.dto.LoginRequest;
import com.sgic.exam.dto.LoginResponse;
import com.sgic.exam.model.Admin;
import com.sgic.exam.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Username and password are required.");
        }

        Optional<Admin> adminOpt = adminRepository.findByUsername(username);

        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();

            // Explicit case-sensitive username check
            if (!admin.getUsername().equals(username)) {
                throw new SecurityException("Invalid username or password.");
            }

            boolean passwordMatches = false;

            // 1. Try BCrypt hash match
            try {
                if (passwordEncoder.matches(password, admin.getPassword())) {
                    passwordMatches = true;
                }
            } catch (Exception ignored) {
                // Not a valid hash or encoder error
            }

            // 2. Legacy migration: Try plain text, then migrate to hash
            if (!passwordMatches && admin.getPassword().equals(password)) {
                passwordMatches = true;
                admin.setPassword(passwordEncoder.encode(password));
                adminRepository.save(admin);
            }

            if (passwordMatches) {
                return LoginResponse.builder()
                        .message("Login successful")
                        .token("admin-auth-token-mock-" + admin.getId())
                        .admin(LoginResponse.AdminInfo.builder()
                                .id(admin.getId())
                                .username(admin.getUsername())
                                .email(admin.getEmail() != null ? admin.getEmail() : "")
                                .name(admin.getName() != null ? admin.getName() : "Admin")
                                .build())
                        .build();
            }

            throw new SecurityException("Invalid username or password.");
        }

        // Hardcoded fallback ONLY if no admins exist yet (initial setup)
        if (adminRepository.count() == 0 && "admin_user".equals(username) && "admin123".equals(password)) {
            return LoginResponse.builder()
                    .message("Login successful (Initial setup)")
                    .token("admin-auth-token-mock-default")
                    .admin(LoginResponse.AdminInfo.builder()
                            .username(username)
                            .email("admin@sgic.com")
                            .name("System Admin")
                            .build())
                    .build();
        }

        throw new SecurityException("Invalid username or password.");
    }
}
