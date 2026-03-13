package com.sgic.exam.controller;

import com.sgic.exam.dto.PasswordChangeRequest;
import com.sgic.exam.dto.ProfileUpdateRequest;
import com.sgic.exam.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/profile/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        try {
            return ResponseEntity.ok(adminService.getProfile(username));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/profile/{currentUsername}")
    public ResponseEntity<?> updateProfile(@PathVariable String currentUsername,
            @RequestBody ProfileUpdateRequest request) {
        try {
            return ResponseEntity.ok(adminService.updateProfile(currentUsername, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/change-password/{username}")
    public ResponseEntity<?> changePassword(@PathVariable String username,
            @RequestBody PasswordChangeRequest request) {
        try {
            adminService.changePassword(username, request);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-password/{username}")
    public ResponseEntity<?> verifyPassword(@PathVariable String username,
            @RequestBody Map<String, String> request) {
        try {
            String password = request.get("password");
            boolean matches = adminService.verifyPassword(username, password);
            if (matches) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Password verified"));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Incorrect password"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }
}
