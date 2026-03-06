package com.sgic.exam.controller;

import com.sgic.exam.model.Question;
import com.sgic.exam.model.Submission;
import com.sgic.exam.model.Test;
import com.sgic.exam.repository.QuestionRepository;
import com.sgic.exam.repository.SubmissionRepository;
import com.sgic.exam.repository.TestRepository;
import com.sgic.exam.repository.StudentExamCodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    @GetMapping
    public ResponseEntity<List<Submission>> getAllSubmissions() {
        return ResponseEntity.ok(submissionRepository.findAll());
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
            com.sgic.exam.model.StudentExamCode codeEntry = studentExamCodeRepository
                    .findByExamCode(request.getExamCode())
                    .orElseThrow(() -> new RuntimeException("Invalid examination code: " + request.getExamCode()));

            Test test = testRepository.findById(codeEntry.getTestId())
                    .orElseThrow(() -> new RuntimeException("Test not found for code: " + request.getExamCode()));

            // Extract answers and IDs
            Map<Long, String> studentAnswers = request.getAnswers() != null ? request.getAnswers()
                    : new HashMap<>();
            List<Question> questions = questionRepository.findAllById(studentAnswers.keySet());

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

            Submission submission = new Submission();
            submission.setStudentName(request.getStudentName() != null && !request.getStudentName().trim().isEmpty()
                    ? request.getStudentName()
                    : "Guest");
            submission.setTestId(test.getId());
            submission.setTestName(test.getName());
            submission.setScore(score);
            submission.setTotalQuestions(questions.size());
            submission.setSubmittedAt(LocalDateTime.now());
            submission.setAnswersJson("Score: " + score + "/" + questions.size());

            // Serialize breakdown to JSON
            try {
                ObjectMapper mapper = new ObjectMapper();
                mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
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

            // Update stats
            try {
                test.setStudentCount((test.getStudentCount() != null ? test.getStudentCount() : 0) + 1);
                testRepository.save(test);
            } catch (Exception testEx) {
                System.err.println("Test Stat Update Warning: " + testEx.getMessage());
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
        private String testName;
        private Long testId;
        private int score;
        private int totalQuestions;
        private String submittedAt;
        private String timeTaken;

        public SubmissionDTO(Submission s, int totalSeconds) {
            this.id = s.getId();
            this.studentName = s.getStudentName();
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
            this.isCorrect = studentAnswer != null && correct != null &&
                    studentAnswer.trim().equalsIgnoreCase(correct.trim());
        }
    }

    @lombok.Data
    public static class SubmissionRequest {
        private String studentName;
        private String examCode;
        private Map<Long, String> answers;
        private Map<Long, Integer> timeSpent;
    }
}
