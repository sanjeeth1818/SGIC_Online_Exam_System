package com.sgic.exam.controller;

import com.sgic.exam.model.EmailConfig;
import com.sgic.exam.repository.EmailConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.InternetAddress;
import java.util.Properties;
import java.util.Map;
import java.util.HashMap;
import java.util.Date;

@RestController
@RequestMapping("/api/settings/email")
public class EmailConfigController {

    @Autowired
    private EmailConfigRepository emailConfigRepository;

    private static final String PRIMARY_CONFIG = "PRIMARY";

    @GetMapping
    public ResponseEntity<EmailConfig> getEmailConfig() {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                .orElseGet(() -> {
                    EmailConfig newConfig = new EmailConfig();
                    newConfig.setConfigName(PRIMARY_CONFIG);
                    newConfig.setSmtpServer("smtp.gmail.com");
                    newConfig.setSmtpPort("587");
                    return newConfig;
                });
        return ResponseEntity.ok(config);
    }

    @PostMapping
    public ResponseEntity<EmailConfig> saveEmailConfig(@RequestBody EmailConfig emailConfig) {
        EmailConfig existingConfig = emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                .orElse(new EmailConfig());

        existingConfig.setConfigName(PRIMARY_CONFIG);
        existingConfig.setSmtpServer(emailConfig.getSmtpServer() != null ? emailConfig.getSmtpServer().trim() : null);
        existingConfig.setSmtpPort(emailConfig.getSmtpPort() != null ? emailConfig.getSmtpPort().trim() : null);
        existingConfig
                .setSenderEmail(emailConfig.getSenderEmail() != null ? emailConfig.getSenderEmail().trim() : null);
        existingConfig
                .setSenderName(emailConfig.getSenderName() != null ? emailConfig.getSenderName().trim() : null);
        existingConfig.setUsername(emailConfig.getUsername() != null ? emailConfig.getUsername().trim() : null);

        // Only update password if provided
        if (emailConfig.getPassword() != null && !emailConfig.getPassword().isEmpty()
                && !emailConfig.getPassword().equals("••••••••••••")) {
            // Trim and remove any internal spaces for App Passwords (like gvpx iukj phlk
            // twgu)
            existingConfig.setPassword(emailConfig.getPassword().trim().replace(" ", ""));
        }

        EmailConfig saved = emailConfigRepository.save(existingConfig);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestBody EmailConfig testConfig) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (testConfig.getSmtpServer() == null || testConfig.getSmtpServer().isEmpty()) {
                response.put("success", false);
                response.put("message", "SMTP Server is required");
                return ResponseEntity.ok(response);
            }

            String host = testConfig.getSmtpServer().trim();
            int port = 587;
            try {
                port = Integer.parseInt(testConfig.getSmtpPort().trim());
            } catch (Exception e) {
                response.put("success", false);
                response.put("message", "Invalid Port number");
                return ResponseEntity.ok(response);
            }

            String username = testConfig.getUsername() != null ? testConfig.getUsername().trim() : "";
            String password = testConfig.getPassword();

            if ("••••••••••••".equals(password)) {
                EmailConfig existing = emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                        .orElse(null);
                if (existing != null) {
                    password = existing.getPassword();
                }
            }

            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.ssl.trust", host);
            props.put("mail.smtp.connectiontimeout", "10000"); // 10s
            props.put("mail.smtp.timeout", "10000");

            // Log for debugging (No passwords logged)
            System.out.println("Testing SMTP connection to " + host + ":" + port + " as " + username);

            Session session = Session.getInstance(props);
            Transport transport = session.getTransport("smtp");

            try {
                transport.connect(host, port, username, password);

                // Connection successful, now send a small test email
                MimeMessage message = new MimeMessage(session);
                if (testConfig.getSenderName() != null && !testConfig.getSenderName().isEmpty()) {
                    message.setFrom(new InternetAddress(testConfig.getSenderEmail(), testConfig.getSenderName()));
                } else {
                    message.setFrom(new InternetAddress(testConfig.getSenderEmail()));
                }
                message.addRecipient(MimeMessage.RecipientType.TO, new InternetAddress(testConfig.getSenderEmail()));
                message.setSubject("SGIC Exam System - SMTP Test");
                message.setText("This is a test email from your SGIC Exam system.\n\n" +
                        "If you are reading this, your SMTP configuration is correct and working!\n\n" +
                        "Date: " + new Date().toString());
                message.setSentDate(new Date());

                transport.sendMessage(message, message.getAllRecipients());
                transport.close();

                response.put("success", true);
                response.put("message",
                        "SMTP Connection Successful! A test email has been sent to " + testConfig.getSenderEmail());
            } catch (jakarta.mail.AuthenticationFailedException afe) {
                response.put("success", false);
                response.put("message",
                        "Authentication Failed: Please ensure your App Password is correct and your Username is your FULL email address.");
            } catch (MessagingException me) {
                response.put("success", false);
                response.put("message", "SMTP Error: " + me.getMessage());
            }

            return ResponseEntity.ok(response);
        } catch (Throwable t) {
            t.printStackTrace();
            response.put("success", false);
            response.put("message", "System Error: " + t.getClass().getSimpleName() + " - " + t.getMessage());
            return ResponseEntity.ok(response);
        }
    }
}
