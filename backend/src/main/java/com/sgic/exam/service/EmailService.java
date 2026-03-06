package com.sgic.exam.service;

import com.sgic.exam.model.EmailConfig;
import com.sgic.exam.model.Student;
import com.sgic.exam.model.Test;
import com.sgic.exam.repository.EmailConfigRepository;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {

    @Autowired
    private EmailConfigRepository emailConfigRepository;

    private static final String PRIMARY_CONFIG = "PRIMARY";

    public void sendSchedulingEmail(Student student, Test test, String examCode, String examDate) {
        System.out.println(
                "Attempting to send scheduling email to " + student.getEmail() + " for test: " + test.getName());

        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null) {
            System.err.println("CRITICAL: Email configuration not found in database! Please save settings first.");
            return;
        }

        String host = config.getSmtpServer();
        int port = 587; // Default SMTP TLS port
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (NumberFormatException e) {
            System.err.println("Invalid SMTP port configured: '" + config.getSmtpPort()
                    + "'. Using default port 587. Error: " + e.getMessage());
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.trust", host); // Trust the SMTP server host
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");

        Session session = Session.getInstance(props); // No Authenticator needed here

        try {
            Transport transport = session.getTransport("smtp");
            System.out.println("Connecting to SMTP server " + host + ":" + port + " with username "
                    + config.getUsername() + "...");
            transport.connect(host, port, config.getUsername(), config.getPassword());
            System.out.println("Successfully connected to SMTP server.");

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("Upcoming Exam: " + test.getName());

            String htmlContent = "<html><body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>" +
                    "<div style='max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;'>"
                    +
                    "<div style='background-color: #007bff; color: white; padding: 20px; text-align: center;'>" +
                    "<h2 style='margin: 0;'>New Exam Scheduled</h2>" +
                    "</div>" +
                    "<div style='padding: 30px;'>" +
                    "<p>Dear <strong>" + student.getName() + "</strong>,</p>" +
                    "<p>You have been scheduled for a new examination. Please find the details below:</p>" +
                    "<div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #007bff;'>"
                    +
                    "<p style='margin: 5px 0;'><strong>Examination:</strong> " + test.getName() + "</p>" +
                    "<p style='margin: 5px 0;'><strong>Scheduled Date:</strong> " + examDate + "</p>" +
                    "<p style='margin: 5px 0;'><strong>Individual Exam Code:</strong> <span style='font-size: 1.25em; color: #d9534f; font-weight: bold;'>"
                    + examCode + "</span></p>" +
                    "</div>" +
                    "<p>Please ensure you are ready on the scheduled date. Use your individual exam code to access the test.</p>"
                    +
                    "<hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />" +
                    "<p>Best regards,<br/><strong>SGIC Examination System</strong></p>" +
                    "</div>" +
                    "<div style='background-color: #f1f1f1; color: #777; padding: 15px; text-align: center; font-size: 0.8em;'>"
                    +
                    "<p>&copy; 2026 SGIC All Rights Reserved</p>" +
                    "</div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");

            System.out.println("Sending email to " + student.getEmail() + "...");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Scheduling email sent to " + student.getEmail());

        } catch (MessagingException e) {
            System.err
                    .println("ERROR: Failed to send scheduling email to " + student.getEmail() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
