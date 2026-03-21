package com.sgic.exam.service;

import com.sgic.exam.model.EmailConfig;
import com.sgic.exam.model.Student;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.Submission;
import com.sgic.exam.dto.QuestionResult;
import com.sgic.exam.repository.EmailConfigRepository;
import com.sgic.exam.repository.AdminRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.model.Admin;
import com.sgic.exam.model.TestCategoryConfig;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.model.StudentExamCode;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Properties;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
public class EmailService {

    @Autowired
    private EmailConfigRepository emailConfigRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    private static final String PRIMARY_CONFIG = "PRIMARY";

    @Async
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("Scheduled Aptitude Examination – SGIC");

            String htmlContent = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                    "<style>" +
                    "  @media screen and (max-width: 600px) {" +
                    "    .container { width: 100% !important; border-radius: 0 !important; border-top: none !important; margin: 0 !important; }" +
                    "    .content { padding: 30px 20px !important; }" +
                    "    .header { padding: 40px 20px 20px 20px !important; }" +
                    "  }" +
                    "</style></head>" +
                    "<body style='font-family: \"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0;'>"
                    +
                    "  <center>" +
                    "    <table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px; background-color: #ffffff; margin: 40px auto; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02);' class='container'>"
                    +
                    "      <tr>" +
                    "        <td align='left' style='padding: 50px 50px 30px 50px; border-top: 6px solid #000000;' class='header'>"
                    +
                    "          <h1 style='margin: 0; color: #111827; font-size: 28px; font-weight: 800; letter-spacing: -0.03em;'>Aptitude Examination</h1>"
                    +
                    "          <p style='margin: 8px 0 0; color: #6b7280; font-size: 15px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;'>Samuel Gnanam IT Centre</p>"
                    +
                    "        </td>" +
                    "      </tr>" +
                    "      <tr>" +
                    "        <td style='padding: 10px 50px 50px 50px;' class='content'>" +
                    "          <p style='font-size: 16px; color: #111827; margin-bottom: 24px;'>Dear <strong>"
                    + student.getName() + "</strong>,</p>" +
                    "          <p style='font-size: 15px; color: #4b5563; line-height: 1.7; margin-bottom: 35px;'>We are pleased to inform you that you have been shortlisted to attend the Aptitude Examination as part of our selection process.</p>"
                    +
                    "          " +
                    "          <h3 style='font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 15px 0; font-weight: 700; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;'>Examination Details</h3>"
                    +
                    "          <div style='background: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 25px; margin-bottom: 35px;'>"
                    +
                    "            <table width='100%' cellpadding='0' cellspacing='0'>" +
                    "              <tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Examination</td><td style='padding: 8px 0; color: #111827; font-weight: 600; font-size: 15px; text-align: right;'>"
                    + test.getName() + "</td></tr>"
                    +
                    "              <tr><td style='padding: 8px 0; color: #6b7280; font-size: 14px;'>Scheduled Date</td><td style='padding: 8px 0; color: #111827; font-weight: 600; font-size: 15px; text-align: right;'>"
                    + examDate + "</td></tr>" +
                    "              <tr><td style='padding: 24px 0 0 0; color: #6b7280; font-size: 14px;'>Individual Exam Code</td><td style='padding: 24px 0 0 0; text-align: right;'><span style='display: inline-block; background: #000000; color: #ffffff; padding: 8px 20px; border-radius: 8px; font-weight: 800; font-size: 20px; letter-spacing: 3px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);'>"
                    + examCode + "</span></td></tr>" +
                    "            </table>" +
                    "          </div>" +
                    "          " +
                    "          <p style='font-size: 15px; color: #4b5563; line-height: 1.7; margin-bottom: 35px;'>Please ensure that you are available on the scheduled date and use your individual exam code to access the test.</p>"
                    +
                    "          " +
                    "          <table width='100%' cellpadding='0' cellspacing='0' style='margin-bottom: 35px;'>" +
                    "            <tr>" +
                    "              <td style='padding-right: 20px; vertical-align: top; width: 50%;'>" +
                    "                <h3 style='font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 12px 0; font-weight: 700;'>Location</h3>"
                    +
                    "                <p style='font-size: 14px; color: #111827; line-height: 1.6; margin: 0; font-weight: 500;'>"
                    +
                    "                  Samuel Gnanam IT Centre<br/><span style='color: #6b7280; font-weight: 400;'>Ground Floor<br/>" +
                    "                  No. 72, Palaly Road,<br/>" +
                    "                  Thirunelveli, Jaffna</span>" +
                    "                </p>" +
                    "              </td>" +
                    "              <td style='vertical-align: top; width: 50%;'>" +
                    "                <h3 style='font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 12px 0; font-weight: 700;'>Dress Code</h3>"
                    +
                    "                <p style='font-size: 14px; color: #111827; margin: 0; font-weight: 500;'>Smart Casual</p>" +
                    "              </td>" +
                    "            </tr>" +
                    "          </table>" +
                    "          " +
                    "          <h3 style='font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 15px 0; font-weight: 700; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;'>Documents to Bring</h3>"
                    +
                    "          <p style='font-size: 14px; color: #6b7280; margin-bottom: 12px; font-style: italic;'>Please submit at reporting time:</p>" +
                    "          <div style='background: #ffffff; border: 1px solid #f4f4f5; border-radius: 12px; padding: 15px 25px; margin-bottom: 30px;'>"
                    +
                    "            <ul style='font-size: 14px; color: #111827; line-height: 2.2; padding-left: 0; list-style: none; margin: 0; font-weight: 500;'>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>Updated CV</li>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>National Identity Card (NIC) &ndash; Copy</li>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>Birth Certificate &ndash; Copy</li>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>G.C.E. Ordinary Level Certificate &ndash; Original &amp; Copy</li>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>G.C.E. Advanced Level Certificate &ndash; Original &amp; Copy</li>"
                    +
                    "              <li style='border-bottom: 1px solid #f4f4f5; padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>Higher Educational Certificates / University ID &ndash; Original &amp; Copy</li>"
                    +
                    "              <li style='padding: 4px 0;'><span style='color: #9ca3af; margin-right: 8px;'>&bull;</span>Work Experience Letters (if any)</li>" +
                    "            </ul>" +
                    "          </div>" +
                    "          " +
                    "          <div style='background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px 20px; margin-bottom: 25px;'>" +
                    "            <p style='font-size: 15px; color: #b91c1c; margin: 0; font-weight: 600;'>Please ensure that you arrive on time for the examination.</p>" +
                    "          </div>"
                    +
                    "          <p style='font-size: 15px; color: #4b5563; line-height: 1.7; margin-bottom: 20px;'>If you have any questions or require further information, feel free to contact us.</p>"
                    +
                    "          <p style='font-size: 15px; color: #4b5563; line-height: 1.7; margin-bottom: 40px;'>We wish you all the best.</p>"
                    +
                    "          " +
                    "          <div style='border-top: 1px solid #f3f4f6; padding-top: 30px;'>" +
                    "            <p style='margin: 0 0 5px 0; font-size: 14px; color: #6b7280;'>Best regards,</p>" +
                    "            <p style='margin: 0; font-size: 16px; font-weight: 700; color: #111827;'>SGIC HR Team</p>"
                    +
                    "            <p style='margin: 6px 0 0; font-size: 13px; color: #9ca3af; line-height: 1.6;'>" +
                    "              Samuel Gnanam IT Centre<br/>" +
                    "              Tel: <span style='color: #4b5563;'>(+94) 21 221 4209</span><br/>" +
                    "              Web: <a href='https://www.samuelgnanam.com' style='color: #000000; text-decoration: underline; font-weight: 500;'>www.samuelgnanam.com</a>"
                    +
                    "            </p>" +
                    "          </div>" +
                    "        </td>" +
                    "      </tr>" +
                    "    </table>" +
                    "  </center>" +
                    "</body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();

            System.out.println("SUCCESS: Scheduling email sent to " + student.getEmail());

        } catch (Exception e) {
            System.err
                    .println("ERROR: Failed to send scheduling email to " + student.getEmail() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Async
    public void sendReschedulingEmail(Student student, Test test, String examCode, String examDate) {
        System.out.println(
                "Attempting to send rescheduling email to " + student.getEmail() + " for test: " + test.getName());

        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null) {
            System.err.println("CRITICAL: Email configuration not found! Rescheduling email skipped.");
            return;
        }

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("Exam Rescheduled: " + test.getName());

            String htmlContent = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                    "<style>" +
                    "  @media screen and (max-width: 600px) {" +
                    "    .container { width: 100% !important; border-radius: 0 !important; }" +
                    "    .content { padding: 40px 25px !important; }" +
                    "    .header { padding: 50px 20px !important; }" +
                    "  }" +
                    "</style></head>" +
                    "<body style='font-family: \"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; background-color: #fefce8; margin: 0; padding: 0;'>"
                    +
                    "  <center>" +
                    "    <table border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 600px; background-color: #ffffff; margin: 30px auto; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);' class='container'>"
                    +
                    "      <tr>" +
                    "        <td align='center' bgcolor='#f59e0b' style='background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 60px 40px;' class='header'>"
                    +
                    "          <img src='https://www.samuelgnanam.com/wp-content/uploads/2021/08/SGIC-Logo-White.png' alt='SGIC Logo' style='height: 45px; margin-bottom: 25px;'>"
                    +
                    "          <h1 style='margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: none;'>Examination Update</h1>"
                    +
                    "          <p style='margin: 10px 0 0; color: #fef3c7; font-size: 16px; font-weight: 500;'>Your session has been rescheduled</p>"
                    +
                    "        </td>" +
                    "      </tr>" +
                    "      <tr>" +
                    "        <td style='padding: 55px 50px;' class='content'>" +
                    "          <p style='font-size: 17px; color: #1e293b; margin-bottom: 28px;'>Dear <strong>"
                    + student.getName() + "</strong>,</p>" +
                    "          <p style='font-size: 16px; color: #475569; line-height: 1.8; margin-bottom: 40px;'>Please take note of the <strong>revised schedule</strong> for your examination session as outlined below. We apologize for any inconvenience caused.</p>"
                    +
                    "          " +
                    "          <h3 style='font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; margin: 0 0 15px 0; font-weight: 800;'>Revised Details</h3>"
                    +
                    "          <div style='background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 30px; margin-bottom: 40px;'>"
                    +
                    "            <table width='100%' cellpadding='0' cellspacing='0'>" +
                    "              <tr><td style='padding: 10px 0; color: #92400e; font-size: 14px;'>Assessment</td><td style='padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 16px; text-align: right;'>"
                    + test.getName() + "</td></tr>" +
                    "              <tr><td style='padding: 10px 0; color: #92400e; font-size: 14px;'>Updated Date</td><td style='padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 16px; text-align: right;'>"
                    + examDate + "</td></tr>" +
                    "              <tr><td style='padding: 20px 0 0 0; color: #92400e; font-size: 14px;'>New Access Code</td><td style='padding: 20px 0 0 0; text-align: right;'><span style='background: #b45309; color: #ffffff; padding: 10px 20px; border-radius: 12px; font-weight: 900; font-size: 24px; letter-spacing: 4px;'>"
                    + examCode + "</span></td></tr>" +
                    "            </table>" +
                    "          </div>" +
                    "          " +
                    "          <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; border-left: 6px solid #f59e0b; margin-bottom: 45px;'>"
                    +
                    "            <h3 style='font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; margin: 0 0 8px 0; font-weight: 800;'>Location Note</h3>"
                    +
                    "            <p style='font-size: 15px; color: #475569; line-height: 1.6; margin: 0;'>" +
                    "              The venue remains the same: Samuel Gnanam IT Centre, Ground Floor. Please ensure you bring all required documents mentioned previously."
                    +
                    "            </p>" +
                    "          </div>" +
                    "          " +
                    "          <div style='text-align: center; border-top: 1px solid #f1f5f9; padding-top: 40px;'>" +
                    "            <p style='margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;'>SGIC HR Team</p>"
                    +
                    "            <p style='margin: 6px 0 0; font-size: 14px; color: #64748b;'>" +
                    "              Samuel Gnanam IT Centre<br/>" +
                    "              Tel: (+94) 21 221 4209 | <a href='https://www.samuelgnanam.com' style='color: #d97706; text-decoration: none; font-weight: 600;'>samuelgnanam.com</a>"
                    +
                    "            </p>" +
                    "          </div>" +
                    "        </td>" +
                    "      </tr>" +
                    "      <tr>" +
                    "        <td align='center' bgcolor='#f8fafc' style='padding: 30px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9;'>"
                    +
                    "          &copy; 2026 Samuel Gnanam IT Centre. Powered by SGIC Recruitment Portal." +
                    "        </td>" +
                    "      </tr>" +
                    "    </table>" +
                    "  </center>" +
                    "</body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();

            System.out.println("SUCCESS: Rescheduling email sent to " + student.getEmail());

        } catch (Exception e) {
            System.err.println(
                    "ERROR: Failed to send rescheduling email to " + student.getEmail() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Async
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
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

    @Async
    public void sendOtpEmail(String email, String otp) {
        System.out.println("Attempting to send OTP email to " + email);
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("Password Reset OTP");

            String htmlContent = "<html><body style='font-family: \"Inter\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;'>"
                    +
                    "<div style='max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;'>"
                    +
                    "  <div style='background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 20px; text-align: center; color: #ffffff;'>"
                    +
                    "    <h2 style='margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;'>Verification Code</h2>"
                    +
                    "  </div>" +
                    "  <div style='padding: 40px; text-align: center;'>" +
                    "    <p style='font-size: 16px; color: #475569; margin-bottom: 30px;'>Use the code below to reset your administrator password. This code will expire in 1 minute.</p>"
                    +
                    "    <div style='background-color: #f1f5f9; padding: 24px; border-radius: 16px; display: inline-block; min-width: 200px; border: 1px solid #e2e8f0;'>"
                    +
                    "      <span style='font-size: 42px; font-family: monospace; font-weight: 800; color: #0f172a; letter-spacing: 0.25em;'>"
                    + otp + "</span>" +
                    "    </div>" +
                    "    <p style='font-size: 14px; color: #94a3b8; margin-top: 30px;'>If you did not request this code, please ignore this email or contact support.</p>"
                    +
                    "  </div>" +
                    "  <div style='background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;'>"
                    +
                    "    <p style='font-size: 12px; color: #64748b; margin: 0;'>&copy; 2026 SGIC Assessment Platform. All Rights Reserved.</p>"
                    +
                    "  </div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: OTP email sent to " + email);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendPasswordChangedEmail(String email) {
        System.out.println("Attempting to send password changed notification to " + email);
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(email));
            message.setSubject("Security Alert: Password Changed");

            String htmlContent = "<html><body style='font-family: \"Inter\", sans-serif; background-color: #f9fafb; padding: 40px 20px;'>"
                    +
                    "<div style='max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; padding: 40px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;'>"
                    +
                    "  <div style='width: 60px; height: 60px; background-color: #dcfce7; color: #166534; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; font-size: 30px;'>&#10003;</div>"
                    +
                    "  <h2 style='color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 16px;'>Password Changed</h2>"
                    +
                    "  <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;'>Your account password has been successfully updated. You can now log in using your new credentials.</p>"
                    +
                    "  <div style='border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 24px; color: #9ca3af; font-size: 13px;'>"
                    +
                    "    If you did not authorize this change, please contact your system administrator immediately." +
                    "  </div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Password change notification sent to " + email);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendAdminTestCreationNotification(Test test) {
        System.out.println("Attempting to send Admin notification for new Test: " + test.getName());
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;

        List<Admin> admins = adminRepository.findAll();
        List<String> adminEmails = admins.stream()
                .map(Admin::getEmail)
                .filter(email -> email != null && !email.isEmpty())
                .collect(Collectors.toList());

        if (adminEmails.isEmpty()) {
            System.out.println("No admin emails found. Skipping notification.");
            return;
        }

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            String recipients = String.join(",", adminEmails);
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipients));
            message.setSubject("New Exam Created: " + test.getName());

            StringBuilder categoriesHtml = new StringBuilder();
            if (test.getCategoryConfigs() != null && !test.getCategoryConfigs().isEmpty()) {
                categoriesHtml.append("<ul>");
                for (TestCategoryConfig cat : test.getCategoryConfigs()) {
                    categoriesHtml.append("<li>").append(cat.getCategoryName()).append(" (")
                            .append(cat.getQuestionCount()).append(" questions)</li>");
                }
                categoriesHtml.append("</ul>");
            } else {
                categoriesHtml.append("<p>Manual Question Selection Mode</p>");
            }

            StringBuilder groupsHtml = new StringBuilder();
            if (test.getStudentGroups() != null && !test.getStudentGroups().isEmpty()) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    groupsHtml.append("<div style='margin-top: 20px;'>")
                            .append("<h4 style='color: #4f46e5; border-bottom: 1px solid #e0e7ff; padding-bottom: 5px;'>Batch: ")
                            .append(group.getExamDate() != null ? group.getExamDate() : "TBD").append("</h4>")
                            .append("<table style='width: 100%; border-collapse: collapse; font-size: 13px;'>")
                            .append("<tr style='background-color: #f8fafc; text-align: left;'>")
                            .append("<th style='padding: 8px; border: 1px solid #e2e8f0;'>Name</th>")
                            .append("<th style='padding: 8px; border: 1px solid #e2e8f0;'>NIC</th>")
                            .append("<th style='padding: 8px; border: 1px solid #e2e8f0;'>Email</th>")
                            .append("<th style='padding: 8px; border: 1px solid #e2e8f0;'>Code</th>")
                            .append("</tr>");

                    if (group.getStudents() != null) {
                        for (Student s : group.getStudents()) {
                            Optional<StudentExamCode> codeOpt = studentExamCodeRepository
                                    .findByTestIdAndStudentId(test.getId(), s.getId());
                            String code = codeOpt.isPresent() ? codeOpt.get().getExamCode() : "N/A";

                            groupsHtml.append("<tr>")
                                    .append("<td style='padding: 8px; border: 1px solid #e2e8f0;'>").append(s.getName())
                                    .append("</td>")
                                    .append("<td style='padding: 8px; border: 1px solid #e2e8f0;'>")
                                    .append(s.getNic() != null ? s.getNic() : "—").append("</td>")
                                    .append("<td style='padding: 8px; border: 1px solid #e2e8f0;'>")
                                    .append(s.getEmail()).append("</td>")
                                    .append("<td style='padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #dc2626;'>")
                                    .append(code).append("</td>")
                                    .append("</tr>");
                        }
                    }
                    groupsHtml.append("</table></div>");
                }
            } else {
                groupsHtml.append("<p>No students allocated yet.</p>");
            }

            String durationText = test.getTimeValue() + " " + test.getTimeUnit();
            if ("question".equalsIgnoreCase(test.getTimeMode())) {
                try {
                    int tQ = (test.getTotalQuestions() != null) ? test.getTotalQuestions() : 0;
                    int tV = Integer.parseInt(test.getTimeValue());
                    durationText = (tQ * tV) + " " + test.getTimeUnit() + " (" + tQ + " questions x " + tV + " "
                            + test.getTimeUnit() + "/per question)";
                } catch (Exception e) {
                }
            }

            String htmlContent = "<html><body style='font-family: sans-serif; color: #334155; line-height: 1.6;'>" +
                    "<div style='max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>"
                    +
                    "  <div style='background: #4f46e5; color: white; padding: 30px; text-align: center;'>" +
                    "    <h2 style='margin: 0;'>Exam Creation Report</h2>" +
                    "    <p style='margin: 5px 0 0; opacity: 0.8;'>A new examination has been successfully published</p>"
                    +
                    "  </div>" +
                    "  <div style='padding: 30px;'>" +
                    "    <h3 style='color: #1e293b; margin-top: 0;'>Exam Overview</h3>" +
                    "    <table style='width: 100%; border-collapse: collapse;'>" +
                    "      <tr><td style='padding: 8px 0; font-weight: bold; width: 140px;'>Exam Name:</td><td>"
                    + test.getName() + "</td></tr>" +
                    "      <tr><td style='padding: 8px 0; font-weight: bold;'>Duration:</td><td>" + durationText
                    + "</td></tr>" +
                    "      <tr><td style='padding: 8px 0; font-weight: bold;'>Mode:</td><td>" + test.getExamMode()
                    + "</td></tr>" +
                    "      <tr><td style='padding: 8px 0; font-weight: bold;'>Description:</td><td style='font-style: italic; color: #64748b;'>"
                    + (test.getDescription() != null ? test.getDescription() : "No description") + "</td></tr>" +
                    "    </table>" +
                    "    <h3 style='color: #1e293b; margin-top: 30px;'>Category Configuration</h3>" +
                    categoriesHtml.toString() +
                    "    <h3 style='color: #1e293b; margin-top: 30px;'>Allocated Students & Codes</h3>" +
                    groupsHtml.toString() +
                    "    <div style='margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 13px; color: #94a3b8;'>"
                    +
                    "      <p>This is an automated security notification from the SGIC Examination System.</p>" +
                    "    </div>" +
                    "  </div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Admin notification email sent for " + test.getName());
        } catch (Exception e) {
            System.err.println("ERROR: Failed to send admin notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Async
    public void sendAdminTestUpdateNotification(Test test, String previousStatus) {
        System.out.println("Attempting to send Admin notification for Updated Test: " + test.getName());
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;

        List<Admin> admins = adminRepository.findAll();
        List<String> adminEmails = admins.stream()
                .map(Admin::getEmail)
                .filter(email -> email != null && !email.isEmpty())
                .collect(Collectors.toList());

        if (adminEmails.isEmpty()) {
            System.out.println("No admin emails found. Skipping notification.");
            return;
        }

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            String recipients = String.join(",", adminEmails);
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipients));
            message.setSubject("Exam Update Report: " + test.getName());

            // Status Change Summary
            String currentStatus = test.getStatus();
            String statusBadgeHtml = "";
            if (previousStatus != null && !previousStatus.equalsIgnoreCase(currentStatus)) {
                statusBadgeHtml = String.format(
                        "<div style='margin-bottom: 20px; padding: 15px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px;'>"
                                +
                                "<p style='margin: 0; font-weight: bold; color: #9a3412;'>Status Updated</p>" +
                                "<p style='margin: 5px 0 0; font-size: 14px; color: #c2410c;'>Previous: <span style='opacity: 0.7;'>%s</span> &rarr; Current: <span style='font-weight: bold;'>%s</span></p>"
                                +
                                "</div>",
                        previousStatus, currentStatus);
            }

            StringBuilder groupsHtml = new StringBuilder();
            if (test.getStudentGroups() != null && !test.getStudentGroups().isEmpty()) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    groupsHtml.append("<div style='margin-top: 25px;'>")
                            .append("<h4 style='color: #4f46e5; border-bottom: 2px solid #eef2ff; padding-bottom: 8px; margin-bottom: 12px; font-size: 15px;'>Batch: ")
                            .append(group.getExamDate() != null ? group.getExamDate() : "TBD").append("</h4>")
                            .append("<table style='width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #f1f5f9;'>")
                            .append("<tr style='background-color: #f8fafc; text-align: left;'>")
                            .append("<th style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>Name</th>")
                            .append("<th style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>Email</th>")
                            .append("<th style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>Code</th>")
                            .append("<th style='padding: 10px; border-bottom: 1px solid #e2e8f0;'>Participation Status</th>")
                            .append("</tr>");

                    if (group.getStudents() != null) {
                        for (Student s : group.getStudents()) {
                            Optional<StudentExamCode> codeOpt = studentExamCodeRepository
                                    .findByTestIdAndStudentId(test.getId(), s.getId());

                            String code = "N/A";
                            String participationStatus = "Pending";
                            String statusColor = "#64748b"; // slate-500

                            if (codeOpt.isPresent()) {
                                code = codeOpt.get().getExamCode();
                                String internalStatus = codeOpt.get().getStatus();
                                if ("USED".equalsIgnoreCase(internalStatus)) {
                                    participationStatus = "Finished (Used Code)";
                                    statusColor = "#16a34a"; // green-600
                                } else if ("STARTED".equalsIgnoreCase(internalStatus)) {
                                    participationStatus = "In Progress (Started)";
                                    statusColor = "#2563eb"; // blue-600
                                } else {
                                    participationStatus = "Active (Code Sent)";
                                    statusColor = "#f97316"; // orange-500
                                }
                            }

                            groupsHtml.append("<tr>")
                                    .append("<td style='padding: 10px; border-bottom: 1px solid #f1f5f9;'>")
                                    .append(s.getName()).append("</td>")
                                    .append("<td style='padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;'>")
                                    .append(s.getEmail()).append("</td>")
                                    .append("<td style='padding: 10px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-weight: bold;'>")
                                    .append(code).append("</td>")
                                    .append("<td style='padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: ")
                                    .append(statusColor).append(";'>")
                                    .append(participationStatus).append("</td>")
                                    .append("</tr>");
                        }
                    }
                    groupsHtml.append("</table></div>");
                }
            } else {
                groupsHtml.append(
                        "<p style='color: #94a3b8; font-style: italic;'>No students allocated to this examination yet.</p>");
            }

            String durationText = test.getTimeValue() + " " + test.getTimeUnit();
            if ("question".equalsIgnoreCase(test.getTimeMode())) {
                try {
                    int tQ = (test.getTotalQuestions() != null) ? test.getTotalQuestions() : 0;
                    int tV = Integer.parseInt(test.getTimeValue());
                    durationText = (tQ * tV) + " " + test.getTimeUnit() + " (" + tQ + " questions x " + tV + " "
                            + test.getTimeUnit() + "/per question)";
                } catch (Exception e) {
                }
            }

            String htmlContent = "<html><body style='font-family: \"Inter\", sans-serif; color: #334155; line-height: 1.6; background-color: #f8fafc; padding: 20px;'>"
                    +
                    "<div style='max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>"
                    +
                    "  <div style='background: #4f46e5; color: white; padding: 40px 30px; text-align: center;'>" +
                    "    <h1 style='margin: 0; font-size: 24px; font-weight: 800;'>Examination Update Report</h1>" +
                    "    <p style='margin: 8px 0 0; opacity: 0.9;'>Finalized report with participation analytics</p>"
                    +
                    "  </div>" +
                    "  <div style='padding: 35px;'>" +
                    statusBadgeHtml +
                    "    <h3 style='color: #1e293b; margin: 0 0 15px 0; font-size: 18px;'>Exam Overview</h3>" +
                    "    <table style='width: 100%; border-collapse: collapse; margin-bottom: 30px;'>" +
                    "      <tr><td style='padding: 10px 0; font-weight: 600; width: 160px; color: #64748b;'>Exam Name:</td><td style='color: #1e293b; font-weight: 600;'>"
                    + test.getName() + "</td></tr>" +
                    "      <tr><td style='padding: 10px 0; font-weight: 600; color: #64748b;'>Duration:</td><td>"
                    + durationText + "</td></tr>" +
                    "      <tr><td style='padding: 10px 0; font-weight: 600; color: #64748b;'>Current Status:</td><td><span style='padding: 4px 12px; background: #f1f5f9; border-radius: 100px; font-size: 12px; font-weight: 700; color: #475569;'>"
                    + currentStatus.toUpperCase() + "</span></td></tr>" +
                    "    </table>" +
                    "    <h3 style='color: #1e293b; margin: 40px 0 10px 0; font-size: 18px;'>Student Allocation & Participation</h3>"
                    +
                    "    <p style='margin: 0; font-size: 14px; color: #94a3b8;'>Summary of all batches and their current engagement status</p>"
                    +
                    groupsHtml.toString() +
                    "    <div style='margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center; font-size: 12px; color: #94a3b8;'>"
                    +
                    "      <p>This report includes the most recent student code activity logs.<br/>" +
                    "      Report generated on "
                    + java.time.LocalDateTime.now()
                            .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                    + "</p>" +
                    "    </div>" +
                    "  </div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Admin update notification email sent for " + test.getName());
        } catch (Exception e) {
            System.err.println("ERROR: Failed to send admin update notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Async
    public void sendAdminStudentFinishedNotification(Student student, Test test, Submission submission,
            List<QuestionResult> breakdown, LocalDateTime startedAt) {
        System.out.println("Attempting to send Admin notification for student completion: " + student.getName());
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;

        List<Admin> admins = adminRepository.findAll();
        List<String> adminEmails = admins.stream()
                .map(Admin::getEmail)
                .filter(email -> email != null && !email.isEmpty())
                .collect(Collectors.toList());

        if (adminEmails.isEmpty())
            return;

        String host = config.getSmtpServer();
        int port = 587;
        try {
            port = Integer.parseInt(config.getSmtpPort());
        } catch (Exception e) {
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
            if (config.getSenderName() != null && !config.getSenderName().isEmpty()) {
                message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            } else {
                message.setFrom(new InternetAddress(config.getSenderEmail()));
            }
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(String.join(",", adminEmails)));
            message.setSubject("Exam Completed: " + student.getName() + " - " + test.getName());

            // Timing Calculations
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String startStr = startedAt != null ? startedAt.format(formatter) : "N/A";
            String endStr = submission.getSubmittedAt() != null ? submission.getSubmittedAt().format(formatter) : "N/A";
            String durationStr = "N/A";
            if (startedAt != null && submission.getSubmittedAt() != null) {
                Duration d = Duration.between(startedAt, submission.getSubmittedAt());
                long h = d.toHours();
                long m = d.toMinutesPart();
                long s = d.toSecondsPart();
                durationStr = String.format("%02d:%02d:%02d", h, m, s);
            }

            // Category Breakdown Logic
            Map<String, int[]> catStats = new HashMap<>(); // [correct, total]
            for (QuestionResult qr : breakdown) {
                String cat = qr.getCategoryName() != null ? qr.getCategoryName() : "Uncategorized";
                int[] stats = catStats.computeIfAbsent(cat, k -> new int[2]);
                stats[1]++;
                if (qr.isCorrect())
                    stats[0]++;
            }

            StringBuilder catHtml = new StringBuilder();
            catHtml.append("<table style='width:100%; border-collapse: collapse; margin-top:10px;'>")
                    .append("<tr style='background:#f8fafc; border-bottom:2px solid #e2e8f0; text-align:left;'>")
                    .append("<th style='padding:10px; border:1px solid #e2e8f0;'>Category</th>")
                    .append("<th style='padding:10px; border:1px solid #e2e8f0;'>Score</th>")
                    .append("<th style='padding:10px; border:1px solid #e2e8f0;'>Percentage</th>")
                    .append("</tr>");

            for (Map.Entry<String, int[]> entry : catStats.entrySet()) {
                int correct = entry.getValue()[0];
                int total = entry.getValue()[1];
                double pct = (total > 0) ? (double) correct / total * 100 : 0;
                catHtml.append("<tr>")
                        .append("<td style='padding:10px; border:1px solid #e2e8f0;'>").append(entry.getKey())
                        .append("</td>")
                        .append("<td style='padding:10px; border:1px solid #e2e8f0;'>").append(correct).append(" / ")
                        .append(total).append("</td>")
                        .append("<td style='padding:10px; border:1px solid #e2e8f0; font-weight:bold;'>")
                        .append(Math.round(pct)).append("%</td>")
                        .append("</tr>");
            }
            catHtml.append("</table>");

            // Detailed Question List
            StringBuilder qHtml = new StringBuilder();
            qHtml.append("<div style='margin-top:20px;'>");
            for (int i = 0; i < breakdown.size(); i++) {
                QuestionResult qr = breakdown.get(i);
                String color = qr.isCorrect() ? "#16a34a" : "#dc2626";
                qHtml.append(
                        "<div style='margin-bottom:15px; padding:15px; border:1px solid #e2e8f0; border-radius:8px;'>")
                        .append("<div style='font-weight:bold; color:#1e293b; margin-bottom:5px;'>Q").append(i + 1)
                        .append(": ").append(qr.getQuestionText()).append("</div>")
                        .append("<div style='font-size:13px;'>")
                        .append("<span style='color:#64748b;'>Student Answer: </span><span style='font-weight:bold; color:")
                        .append(color).append(";'>")
                        .append(qr.getStudentAnswer() != null ? qr.getStudentAnswer() : "No Answer")
                        .append("</span><br/>")
                        .append("<span style='color:#64748b;'>Correct Answer: </span><span style='font-weight:bold; color:#16a34a;'>")
                        .append(qr.getCorrectAnswer()).append("</span>")
                        .append("</div></div>");
            }
            qHtml.append("</div>");

            String htmlContent = "<html><body style='font-family:sans-serif; color:#334155; line-height:1.6; padding:20px; background:#f4f7f9;'>"
                    +
                    "<div style='max-width:750px; margin:0 auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);'>"
                    +
                    "  <div style='background:#1e40af; color:white; padding:30px; text-align:center;'>" +
                    "    <h2 style='margin:0;'>Student Result Report</h2>" +
                    "    <p style='margin:5px 0 0; opacity:0.8;'>Exam submission received from " + student.getName()
                    + "</p>" +
                    "  </div>" +
                    "  <div style='padding:30px;'>" +
                    "    <h3 style='color:#1e293b; border-bottom:2px solid #eff6ff; padding-bottom:10px;'>Summary</h3>"
                    +
                    "    <div style='display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;'>" +
                    "      <div>" +
                    "        <p style='margin:5px 0;'><strong>Student:</strong> " + student.getName() + " ("
                    + student.getEmail() + ")</p>" +
                    "        <p style='margin:5px 0;'><strong>Exam:</strong> " + test.getName() + "</p>" +
                    "        <p style='margin:5px 0;'><strong>Final Score:</strong> <span style='font-size:1.2em; color:#1e40af; font-weight:800;'>"
                    + submission.getScore() + " / " + submission.getTotalQuestions() + "</span></p>" +
                    "      </div>" +
                    "      <div style='text-align:right;'>" +
                    "        <p style='margin:5px 0;'><strong>Started:</strong> " + startStr + "</p>" +
                    "        <p style='margin:5px 0;'><strong>Finished:</strong> " + endStr + "</p>" +
                    "        <p style='margin:5px 0;'><strong>Total Time:</strong> " + durationStr + "</p>" +
                    "      </div>" +
                    "    </div>" +
                    "    <h3 style='color:#1e293b; border-bottom:2px solid #eff6ff; padding-bottom:10px; margin-top:30px;'>Category Performance</h3>"
                    +
                    catHtml.toString() +
                    "    <h3 style='color:#1e293b; border-bottom:2px solid #eff6ff; padding-bottom:10px; margin-top:30px;'>Detailed Review</h3>"
                    +
                    qHtml.toString() +
                    "    <div style='margin-top:40px; border-top:1px solid #f1f5f9; padding-top:20px; text-align:center; font-size:12px; color:#94a3b8; font-style:italic;'>"
                    +
                    "      This is a system-generated result notification for the SGIC Examination Platform." +
                    "    </div>" +
                    "  </div>" +
                    "</div></body></html>";

            message.setContent(htmlContent, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
            System.out.println("SUCCESS: Admin student completion notification sent for " + student.getName());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendBatchDateChangeStudentNotification(Student student, Test test, String oldDate, String newDate,
            String code) {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.trust", config.getSmtpServer());
            Session session = Session.getInstance(props);
            Transport transport = session.getTransport("smtp");
            transport.connect(config.getSmtpServer(), Integer.parseInt(config.getSmtpPort()), config.getUsername(),
                    config.getPassword());
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("URGENT: Exam Schedule Updated - " + test.getName());
            String html = "<html><body style='font-family:sans-serif; background:#fff9db; padding:20px;'>" +
                    "<div style='max-width:600px; margin:0 auto; background:white; border-radius:12px; border:1px solid #ffec99; overflow:hidden;'>"
                    +
                    "  <div style='background:#fcc419; color:#444; padding:25px; text-align:center;'><h2>Schedule Update</h2></div>"
                    +
                    "  <div style='padding:30px;'>" +
                    "    <p>Dear <strong>" + student.getName() + "</strong>,</p>" +
                    "    <p>Please note that your examination schedule for <strong>" + test.getName()
                    + "</strong> has been adjusted.</p>" +
                    "    <div style='margin:20px 0; padding:15px; background:#f8f9fa; border-radius:8px; border-left:4px solid #fcc419;'>"
                    +
                    "      <p style='margin:5px 0; text-decoration:line-through; color:#888;'>Previous Date: " + oldDate
                    + "</p>" +
                    "      <p style='margin:5px 0; font-size:1.1em; color:#e67e22; font-weight:bold;'>New Date: "
                    + newDate + "</p>" +
                    "      <p style='margin:5px 0;'>Exam Code: <strong>" + code + "</strong></p>" +
                    "    </div>" +
                    "    <p>Please update your calendar accordingly. We apologize for any inconvenience.</p>" +
                    "    <p>Regards,<br/>SGIC Examination Team</p>" +
                    "  </div>" +
                    "</div></body></html>";
            message.setContent(html, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendBatchDateChangeAdminNotification(Test test, String oldDate, String newDate,
            List<Student> students) {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;
        List<Admin> admins = adminRepository.findAll();
        String adminEmails = admins.stream().map(Admin::getEmail).filter(e -> e != null && !e.isEmpty())
                .collect(Collectors.joining(","));
        if (adminEmails.isEmpty())
            return;
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.trust", config.getSmtpServer());
            Session session = Session.getInstance(props);
            Transport transport = session.getTransport("smtp");
            transport.connect(config.getSmtpServer(), Integer.parseInt(config.getSmtpPort()), config.getUsername(),
                    config.getPassword());
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(adminEmails));
            message.setSubject("Admin Alert: Batch Date Shifted - " + test.getName());
            StringBuilder sb = new StringBuilder("<html><body>")
                    .append("<h3>Batch Date Change Report</h3>")
                    .append("<p>Exam: <strong>").append(test.getName()).append("</strong></p>")
                    .append("<p>Shifted from <span style='color:red;'>").append(oldDate)
                    .append("</span> to <span style='color:green;'>").append(newDate).append("</span></p>")
                    .append("<h4>Affected Students:</h4><ul>");
            for (Student s : students)
                sb.append("<li>").append(s.getName()).append(" (").append(s.getEmail()).append(")</li>");
            sb.append("</ul></body></html>");
            message.setContent(sb.toString(), "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendCancellationStudentNotification(Student student, Test test) {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.trust", config.getSmtpServer());
            Session session = Session.getInstance(props);
            Transport transport = session.getTransport("smtp");
            transport.connect(config.getSmtpServer(), Integer.parseInt(config.getSmtpPort()), config.getUsername(),
                    config.getPassword());
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(student.getEmail()));
            message.setSubject("IMPORTANT: Examination Session Postponed - " + test.getName());
            String html = "<html><body style='font-family:sans-serif; background:#fff5f5; padding:20px;'>" +
                    "<div style='max-width:600px; margin:0 auto; background:white; border-radius:12px; border:1px solid #ffa8a8; overflow:hidden;'>"
                    +
                    "  <div style='background:#ff6b6b; color:white; padding:25px; text-align:center;'><h2>Session Cancelled</h2></div>"
                    +
                    "  <div style='padding:30px;'>" +
                    "    <p>Dear <strong>" + student.getName() + "</strong>,</p>" +
                    "    <p>We regret to inform you that your scheduled session for <strong>" + test.getName()
                    + "</strong> has been postponed/cancelled.</p>" +
                    "    <div style='margin:20px 0; padding:20px; background:#fff5f5; border-radius:8px; border:1px solid #ffc9c9; text-align:center;'>"
                    +
                    "      <p style='margin:0; font-weight:bold; color:#e03131;'>We will notify you of the new schedule as soon as possible (ASAP).</p>"
                    +
                    "    </div>" +
                    "    <p>Your current exam code has been deactivated. Please wait for the next official communication from our team.</p>"
                    +
                    "    <p>Regards,<br/>SGIC Examination Team</p>" +
                    "  </div>" +
                    "</div></body></html>";
            message.setContent(html, "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Async
    public void sendCancellationAdminNotification(Test test, List<Student> affectedStudents, String reason) {
        EmailConfig config = emailConfigRepository.findByConfigName(PRIMARY_CONFIG).orElse(null);
        if (config == null)
            return;
        List<Admin> admins = adminRepository.findAll();
        String adminEmails = admins.stream().map(Admin::getEmail).filter(e -> e != null && !e.isEmpty())
                .collect(Collectors.joining(","));
        if (adminEmails.isEmpty())
            return;
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.trust", config.getSmtpServer());
            Session session = Session.getInstance(props);
            Transport transport = session.getTransport("smtp");
            transport.connect(config.getSmtpServer(), Integer.parseInt(config.getSmtpPort()), config.getUsername(),
                    config.getPassword());
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(config.getSenderEmail(), config.getSenderName()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(adminEmails));
            message.setSubject("Admin Alert: Exam Deletion/Cancellation Report - " + test.getName());
            StringBuilder sb = new StringBuilder("<html><body style='font-family:sans-serif;'>")
                    .append("<h2 style='color:#e03131;'>Cancellation Report</h2>")
                    .append("<p>Exam: <strong>").append(test.getName()).append("</strong></p>")
                    .append("<p>Reason: <span style='color:#555;'>").append(reason).append("</span></p>")
                    .append("<p>Students Affected: <strong>").append(affectedStudents.size()).append("</strong></p>")
                    .append("<table border='1' style='width:100%; border-collapse:collapse;'>")
                    .append("<tr style='background:#f8f9fa;'><th>Student Name</th><th>Email</th><th>Previous Status</th></tr>");
            for (Student s : affectedStudents) {
                sb.append("<tr><td style='padding:5px;'>").append(s.getName()).append("</td>")
                        .append("<td style='padding:5px;'>").append(s.getEmail()).append("</td>")
                        .append("<td style='padding:5px;'>").append(s.getStatus()).append("</td></tr>");
            }
            sb.append("</table></body></html>");
            message.setContent(sb.toString(), "text/html; charset=utf-8");
            transport.sendMessage(message, message.getAllRecipients());
            transport.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
