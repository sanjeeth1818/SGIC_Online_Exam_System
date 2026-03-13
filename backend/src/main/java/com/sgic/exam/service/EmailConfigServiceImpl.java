package com.sgic.exam.service;

import com.sgic.exam.dto.EmailConfigRequest;
import com.sgic.exam.dto.SmtpTestResponse;
import com.sgic.exam.model.EmailConfig;
import com.sgic.exam.repository.EmailConfigRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.Properties;

@Service
public class EmailConfigServiceImpl implements EmailConfigService {

    private static final String PRIMARY_CONFIG = "PRIMARY";
    private static final String PASSWORD_MASK = "••••••••••••";

    @Autowired
    private EmailConfigRepository emailConfigRepository;

    @Override
    public EmailConfig getEmailConfig() {
        return emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                .orElseGet(() -> {
                    EmailConfig defaults = new EmailConfig();
                    defaults.setConfigName(PRIMARY_CONFIG);
                    defaults.setSmtpServer("smtp.gmail.com");
                    defaults.setSmtpPort("587");
                    return defaults;
                });
    }

    @Override
    @Transactional
    public EmailConfig saveEmailConfig(EmailConfigRequest request) {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                .orElse(new EmailConfig());

        config.setConfigName(PRIMARY_CONFIG);
        config.setSmtpServer(trimOrNull(request.getSmtpServer()));
        config.setSmtpPort(trimOrNull(request.getSmtpPort()));
        config.setSenderEmail(trimOrNull(request.getSenderEmail()));
        config.setSenderName(trimOrNull(request.getSenderName()));
        config.setUsername(trimOrNull(request.getUsername()));

        // Only update password if a real value was provided (not the mask placeholder)
        String newPassword = request.getPassword();
        if (newPassword != null && !newPassword.isEmpty() && !PASSWORD_MASK.equals(newPassword)) {
            // Strip spaces for App Passwords (e.g. "gvpx iukj phlk twgu" format)
            config.setPassword(newPassword.trim().replace(" ", ""));
        }

        return emailConfigRepository.save(config);
    }

    @Override
    public SmtpTestResponse testSmtpConnection(EmailConfigRequest request) {
        if (request.getSmtpServer() == null || request.getSmtpServer().isEmpty()) {
            return SmtpTestResponse.builder().success(false).message("SMTP Server is required").build();
        }

        String host = request.getSmtpServer().trim();
        int port;
        try {
            port = Integer.parseInt(request.getSmtpPort().trim());
        } catch (Exception e) {
            return SmtpTestResponse.builder().success(false).message("Invalid Port number").build();
        }

        String username = request.getUsername() != null ? request.getUsername().trim() : "";
        String password = request.getPassword();

        // If frontend sent the mask, fetch the real password from the database
        if (PASSWORD_MASK.equals(password)) {
            password = emailConfigRepository.findByConfigName(PRIMARY_CONFIG)
                    .map(EmailConfig::getPassword)
                    .orElse(null);
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.trust", host);
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");

        System.out.println("Testing SMTP connection to " + host + ":" + port + " as " + username);

        Session session = Session.getInstance(props);
        try (Transport transport = session.getTransport("smtp")) {
            transport.connect(host, port, username, password);

            MimeMessage message = new MimeMessage(session);
            if (request.getSenderName() != null && !request.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(request.getSenderEmail(), request.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(request.getSenderEmail()));
            }
            message.addRecipient(MimeMessage.RecipientType.TO, new InternetAddress(request.getSenderEmail()));
            message.setSubject("SGIC Exam System - SMTP Test");
            message.setText("This is a test email from your SGIC Exam system.\n\n" +
                    "If you are reading this, your SMTP configuration is correct and working!\n\n" +
                    "Date: " + new Date());
            message.setSentDate(new Date());
            transport.sendMessage(message, message.getAllRecipients());

            return SmtpTestResponse.builder()
                    .success(true)
                    .message("SMTP Connection Successful! A test email has been sent to " + request.getSenderEmail())
                    .build();

        } catch (jakarta.mail.AuthenticationFailedException e) {
            return SmtpTestResponse.builder()
                    .success(false)
                    .message(
                            "Authentication Failed: Please ensure your App Password is correct and your Username is your FULL email address.")
                    .build();
        } catch (MessagingException e) {
            return SmtpTestResponse.builder()
                    .success(false)
                    .message("SMTP Error: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            return SmtpTestResponse.builder()
                    .success(false)
                    .message("System Error: " + e.getClass().getSimpleName() + " - " + e.getMessage())
                    .build();
        }
    }

    private String trimOrNull(String value) {
        return value != null ? value.trim() : null;
    }
}
