package com.sgic.exam.service;

import com.sgic.exam.model.EmailConfig;
import com.sgic.exam.model.Student;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.Submission;
import com.sgic.exam.controller.SubmissionController.QuestionResult;
import com.sgic.exam.repository.EmailConfigRepository;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
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

            System.out.println("SUCCESS: Scheduling email sent to " + student.getEmail());

        } catch (MessagingException e) {
            System.err
                    .println("ERROR: Failed to send scheduling email to " + student.getEmail() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendResultEmail(Student student, Test test, Submission submission, List<QuestionResult> breakdown) {
        System.out.println("Attempting to send result email to " + student.getEmail() + " for test: " + test.getName());

        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null) {
            System.err.println("CRITICAL: Email configuration not found! Results email skipped.");
            return;
        }

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (NumberFormatException e) {
            System.err.println("Invalid SMTP port. Using 587.");
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.ssl.trust", host);

        Session session = Session.getInstance(props);

        try {
            Transport transport = session.getTransport("smtp");
            transport.connect(host, port, config.getUsername(), config.getPassword());

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("Examination Result: " + test.getName());

            boolean showAnswers = Boolean.TRUE.equals(test.getShowAnswers());
            String status = (submission.getScore() >= submission.getTotalQuestions() / 2) ? "PASSED" : "COMPLETED";
            String statusColor = status.equals("PASSED") ? "#166534" : "#1e40af";
            String statusBg = status.equals("PASSED") ? "#dcfce7" : "#dbeafe";

            StringBuilder answersHtml = new StringBuilder();
            if (showAnswers && breakdown != null && !breakdown.isEmpty()) {
                answersHtml.append("<div style='margin-top: 40px;'>")
                        .append("<h3 style='font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px;'>Detailed Review</h3>")
                        .append("<div style='overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 12px;'>")
                        .append("<table style='width: 100%; border-collapse: collapse; min-width: 500px;'>")
                        .append("<thead><tr style='background-color: #f9fafb;'>")
                        .append("<th style='padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase;'>Question</th>")
                        .append("<th style='padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase;'>Your Answer</th>")
                        .append("<th style='padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase;'>Result</th>")
                        .append("</tr></thead><tbody>");

                for (QuestionResult qr : breakdown) {
                    String resultColor = qr.isCorrect() ? "#166534" : "#991b1b";
                    String resultText = qr.isCorrect() ? "Correct" : "Incorrect";
                    String resultBg = qr.isCorrect() ? "#dcfce7" : "#fee2e2";

                    answersHtml.append("<tr>")
                            .append("<td style='padding: 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #1f2937;'>")
                            .append(qr.getQuestionText()).append("</td>")
                            .append("<td style='padding: 15px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #4b5563;'>")
                            .append(qr.getStudentAnswer() != null ? qr.getStudentAnswer() : "<i>No Answer</i>")
                            .append("</td>")
                            .append("<td style='padding: 15px; border-bottom: 1px solid #f3f4f6;'>")
                            .append("<span style='padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; background-color: ")
                            .append(resultBg).append("; color: ").append(resultColor).append(";'>")
                            .append(resultText).append("</span>")
                            .append("</td></tr>");
                }
                answersHtml.append("</tbody></table></div></div>");
            }

            String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 20px;'>"
                    +
                    "<div style='max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e1e8ed;'>"
                    +
                    "<div style='background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 40px 20px; text-align: center; color: #ffffff;'>"
                    +
                    "<h1 style='margin: 0; font-size: 28px; font-weight: 800;'>Examination Result</h1>" +
                    "<p style='margin: 10px 0 0; opacity: 0.9;'>SGIC Assessment Platform</p>" +
                    "</div>" +
                    "<div style='padding: 40px;'>" +
                    "<p style='font-size: 16px; color: #1f2937;'>Dear <strong>" + student.getName() + "</strong>,</p>" +
                    "<p style='font-size: 15px; color: #4b5563; line-height: 1.6;'>Thank you for participating in the assessment. Your results for <strong>"
                    + test.getName() + "</strong> are now available.</p>" +
                    "<div style='background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 20px; padding: 30px; margin: 30px 0; text-align: center;'>"
                    +
                    "<p style='font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;'>Total Score</p>"
                    +
                    "<div style='font-size: 48px; font-weight: 900; color: #111827; margin-bottom: 12px;'>"
                    + submission.getScore() + " <span style='font-size: 24px; color: #9ca3af;'>/ "
                    + submission.getTotalQuestions() + "</span></div>" +
                    "<span style='padding: 6px 16px; background-color: " + statusBg + "; color: " + statusColor
                    + "; border-radius: 100px; font-size: 13px; font-weight: 800;'>" + status + "</span>" +
                    "</div>" +
                    answersHtml.toString() +
                    "<p style='margin-top: 30px; font-size: 15px; color: #4b5563; line-height: 1.6;'>If you have any questions regarding your performance, please reach out to your instructor.</p>"
                    +
                    "<div style='margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6;'>" +
                    "<p style='font-size: 13px; color: #9ca3af; margin: 0;'>Best Regards,</p>" +
                    "<p style='font-size: 15px; font-weight: 700; color: #1f2937; margin: 4px 0 0;'>SGIC Examination Team</p>"
                    +
                    "</div></div>" +
                    "<div style='background-color: #f9fafb; padding: 20px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6;'>"
                    +
                    "<p>&copy; 2026 SGIC All Rights Reserved</p>" +
                    "</div></div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Result email sent to " + student.getEmail());

        } catch (Exception e) {
            System.err.println("ERROR: Failed to send result email to " + student.getEmail() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
