package com.sgic.exam.controller;

import com.sgic.exam.model.Question;
import com.sgic.exam.model.Submission;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.Student;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.SubmissionRepository;
import com.sgic.exam.repository.StudentRepository;
import com.sgic.exam.repository.TestRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public ResponseEntity<List<Submission>> getAllSubmissions() {
        List<Submission> all = submissionRepository.findAll();
        for (Submission s : all) {
            // Backfill email for older records if missing
            if (s.getStudentEmail() == null) {
                if (s.getStudentId() != null) {
                    studentRepository.findById(s.getStudentId()).ifPresent(student -> {
                        s.setStudentEmail(student.getEmail());
                        submissionRepository.save(s);
                        System.out.println("Backfilled email for " + student.getName());
                    });
                } else if (s.getStudentName() != null) {
                    // Fallback to lookup by name if studentId is missing
                    studentRepository.findAll().stream()
                            .filter(st -> s.getStudentName().equals(st.getName()))
                            .findFirst()
                            .ifPresent(student -> {
                                s.setStudentEmail(student.getEmail());
                                submissionRepository.save(s);
                                System.out.println("Backfilled email by name for " + s.getStudentName());
                            });
                }
            }
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<Submission> all = submissionRepository.findAll();
        long totalAttempts = all.size();
        double avgScore = all.stream().mapToInt(Submission::getScore).average().orElse(0.0);
        long passCount = all.stream().filter(s -> (double) s.getScore() / s.getTotalQuestions() >= 0.5).count();

        return ResponseEntity.ok(Map.of(
                "totalAttempts", totalAttempts,
                "averageScore", Math.round(avgScore * 10.0) / 10.0,
                "passRate", totalAttempts > 0 ? Math.round((double) passCount / totalAttempts * 100) : 0));
    }

    @PostMapping
    public ResponseEntity<?> submitTest(@RequestBody SubmissionRequest request) {
        System.out.println("Processing submission for exam code: " + request.getExamCode());
        try {
            if (request.getExamCode() == null || request.getExamCode().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Examination code is required");
            }

            // Look up test ID from student exam code
            StudentExamCode codeEntry = studentExamCodeRepository
                    .findByExamCode(request.getExamCode())
                    .orElseThrow(() -> new RuntimeException("Invalid examination code: " + request.getExamCode()));

            Test test = testRepository.findById(Objects.requireNonNull(codeEntry.getTestId()))
                    .orElseThrow(() -> new RuntimeException("Test not found for code: " + request.getExamCode()));

            // Extract answers and IDs
            Map<Long, String> studentAnswers = request.getAnswers() != null ? request.getAnswers() : new HashMap<>();

            // PRESERVE ORDER: Fetch questions in the exact order assigned to the student
            List<Question> questions = new ArrayList<>();
            if (codeEntry.getAssignedQuestionIds() != null && !codeEntry.getAssignedQuestionIds().isEmpty()) {
                String[] ids = codeEntry.getAssignedQuestionIds().split(",");
                for (String sId : ids) {
                    if (!sId.trim().isEmpty()) {
                        questionRepository.findById(Objects.requireNonNull(Long.valueOf(sId.trim())))
                                .ifPresent(questions::add);
                    }
                }
            } else {
                // Fallback to unordered if for some reason IDs aren't persisted
                questions = questionRepository.findAllById(studentAnswers.keySet());
            }

            int score = 0;
            List<QuestionResult> breakdown = new ArrayList<>();

            for (Question q : questions) {
                String studentAnswer = studentAnswers.get(q.getId());
                Integer timeValue = (request.getTimeSpent() != null) ? request.getTimeSpent().get(q.getId()) : 0;
                int timeSpentOnQ = (timeValue != null) ? timeValue : 0;

                QuestionResult qr = new QuestionResult(q, studentAnswer, timeSpentOnQ);
                breakdown.add(qr);

                if (qr.isCorrect()) {
                    score++;
                }
            }

            // Check for existing submission for this attempt (resumption support)
            Submission submission = submissionRepository.findByExamCode(request.getExamCode()).orElse(new Submission());

            submission.setStudentName(request.getStudentName() != null && !request.getStudentName().trim().isEmpty()
                    ? request.getStudentName()
                    : "Guest");

            // Populate student email from student record
            if (codeEntry.getStudentId() != null) {
                studentRepository.findById(codeEntry.getStudentId()).ifPresent(s -> {
                    submission.setStudentEmail(s.getEmail());
                });
            }

            submission.setTestId(test.getId());
            submission.setTestName(test.getName());
            submission.setStudentId(codeEntry.getStudentId());
            submission.setExamCode(codeEntry.getExamCode());
            submission.setScore(score);
            submission.setTotalQuestions(questions.size());
            submission.setSubmittedAt(LocalDateTime.now());
            submission.setAnswersJson("Score: " + score + "/" + questions.size());

            // Serialize breakdown to JSON
            try {
                ObjectMapper mapper = new ObjectMapper();
                mapper.registerModule(new JavaTimeModule());
                submission.setDetailedBreakdownJson(mapper.writeValueAsString(breakdown));
            } catch (Exception e) {
                System.err.println("JSON Serialization failed: " + e.getMessage());
                submission.setDetailedBreakdownJson("[]");
            }

            // Persistence
            System.out.println("Attempting to save submission to database...");
            Submission savedSubmission;
            try {
                savedSubmission = submissionRepository.save(submission);
                System.out.println("Submission saved successfully with ID: " + savedSubmission.getId());
            } catch (Exception dbEx) {
                System.err.println("DATABASE PERSISTENCE ERROR: " + dbEx.getMessage());
                dbEx.printStackTrace();
                return ResponseEntity.status(500).body("Database Error: " + dbEx.getMessage());
            }

            // Update student status to 'Took Exam' - ONLY on final submission
            if (request.isFinal()) {
                try {
                    Student student = studentRepository
                            .findById(Objects.requireNonNull(codeEntry.getStudentId())).orElse(null);
                    if (student != null) {
                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                .format(new java.util.Date());
                        String logEntry = String.format("[%s] Status: Took Exam (Exam: %s)", timestamp, test.getName());
                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
                        student.setStatus("Took Exam");
                        studentRepository.save(student);
                        System.out.println("Updated student " + student.getName() + " status to Took Exam.");
                    }
                } catch (Exception statusEx) {
                    System.err
                            .println("Warning: Could not update student status to Took Exam: " + statusEx.getMessage());
                }
            }

            // Trigger Result Email - ONLY on final submission
            if (request.isFinal()) {
                try {
                    Student student = studentRepository
                            .findById(Objects.requireNonNull(codeEntry.getStudentId()))
                            .orElse(null);
                    if (student != null) {
                        if (Boolean.TRUE.equals(test.getShowResult())) {
                            emailService.sendResultEmail(student, test, savedSubmission, breakdown);
                        }
                        // Always notify admin on completion
                        emailService.sendAdminStudentFinishedNotification(student, test, savedSubmission, breakdown,
                                codeEntry.getStartedAt());
                    }
                } catch (Exception emailEx) {
                    System.err.println("Warning: Failed to trigger result email: " + emailEx.getMessage());
                    emailEx.printStackTrace();
                }
            }

            // Return DTO instead of full entity to avoid serialization issues
            int totalSeconds = breakdown.stream().mapToInt(QuestionResult::getTimeSpent).sum();
            SubmissionDTO dto = new SubmissionDTO(savedSubmission, totalSeconds);

            return ResponseEntity.ok(new SubmissionResponse(
                    dto,
                    breakdown,
                    Boolean.TRUE.equals(test.getShowResult()),
                    Boolean.TRUE.equals(test.getShowAnswers())));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Internal Error: " + e.getMessage());
        }
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class SubmissionResponse {
        private SubmissionDTO submission;
        private List<QuestionResult> breakdown;
        private boolean showResult;
        private boolean showAnswers;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class SubmissionDTO {
        private Long id;
        private String studentName;
        private String studentEmail;
        private String testName;
        private Long testId;
        private int score;
        private int totalQuestions;
        private String submittedAt;
        private String timeTaken;

        public SubmissionDTO(Submission s, int totalSeconds) {
            this.id = s.getId();
            this.studentName = s.getStudentName();
            this.studentEmail = s.getStudentEmail();
            this.testName = s.getTestName();
            this.testId = s.getTestId();
            this.score = s.getScore();
            this.totalQuestions = s.getTotalQuestions();
            this.submittedAt = s.getSubmittedAt() != null ? s.getSubmittedAt().toString() : "";

            int mins = totalSeconds / 60;
            int secs = totalSeconds % 60;
            this.timeTaken = (mins > 0) ? mins + "m " + secs + "s" : secs + "s";
        }
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    public static class QuestionResult {
        private Long questionId;
        private String questionText;
        private String categoryName;
        private String studentAnswer;
        private String correctAnswer;
        private boolean isCorrect;
        private int timeSpent;

        public QuestionResult(Question q, String studentAnswer, int timeSpent) {
            this.questionId = q.getId();
            this.questionText = q.getText();
            this.categoryName = (q.getCategory() != null) ? q.getCategory().getName() : "Uncategorized";
            this.studentAnswer = studentAnswer;
            this.correctAnswer = q.getCorrectAnswer();
            this.timeSpent = timeSpent;

            String correct = q.getCorrectAnswer();
            this.isCorrect = compareAnswers(studentAnswer, correct);
        }

        private boolean compareAnswers(String s1, String s2) {
            if (s1 == null || s2 == null)
                return false;

            // 1. Aggressive Normalization:
            // - Normalize Unicode characters (Form NFC)
            // - Remove control characters
            // - Replace all types of whitespace (including &nbsp; \u00A0) with a standard
            // space
            // - Trim
            String norm1 = java.text.Normalizer.normalize(s1, java.text.Normalizer.Form.NFC)
                    .replaceAll("[\\p{Cntrl}\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}]", "")
                    .replaceAll("\\s+", " ").trim();
            String norm2 = java.text.Normalizer.normalize(s2, java.text.Normalizer.Form.NFC)
                    .replaceAll("[\\p{Cntrl}\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}]", "")
                    .replaceAll("\\s+", " ").trim();

            // 2. Simple case-insensitive comparison
            if (norm1.equalsIgnoreCase(norm2))
                return true;

            // 3. Ultra-strict comparison (Remove ALL spaces) as final fallback
            String strict1 = norm1.replaceAll("\\s", "");
            String strict2 = norm2.replaceAll("\\s", "");
            if (!strict1.isEmpty() && strict1.equalsIgnoreCase(strict2))
                return true;

            // 4. Numeric Fallback: If both are potentially numbers, compare their values
            try {
                // Remove commas and any remaining spaces
                String num1 = strict1.replace(",", "");
                String num2 = strict2.replace(",", "");

                double d1 = Double.parseDouble(num1);
                double d2 = Double.parseDouble(num2);

                return d1 == d2;
            } catch (NumberFormatException e) {
                return false;
            }
        }
    }

    @lombok.Data
    public static class SubmissionRequest {
        private String studentName;
        private String examCode;
        private Map<Long, String> answers;
        private Map<Long, Integer> timeSpent;
        private boolean isFinal; // Distinguish between auto-save and final completion
    }
}
