package com.sgic.exam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sgic.exam.dto.*;
import com.sgic.exam.model.*;
import com.sgic.exam.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SubmissionServiceImpl implements SubmissionService {

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

    @Override
    public List<Submission> getAllSubmissions() {
        List<Submission> all = submissionRepository.findAll();
        for (Submission s : all) {
            if (s.getStudentEmail() == null) {
                backfillStudentEmail(s);
            }
        }
        return all;
    }

    private void backfillStudentEmail(Submission s) {
        if (s.getStudentId() != null) {
            studentRepository.findById(s.getStudentId()).ifPresent(student -> {
                s.setStudentEmail(student.getEmail());
                submissionRepository.save(s);
            });
        }
    }

    @Override
    public Map<String, Object> getSubmissionStats() {
        List<Submission> all = submissionRepository.findAll();
        long totalAttempts = all.size();
        double avgScore = all.stream().mapToInt(Submission::getScore).average().orElse(0.0);
        long passCount = all.stream().filter(s -> (double) s.getScore() / s.getTotalQuestions() >= 0.5).count();

        return Map.of(
                "totalAttempts", totalAttempts,
                "averageScore", Math.round(avgScore * 10.0) / 10.0,
                "passRate", totalAttempts > 0 ? Math.round((double) passCount / totalAttempts * 100) : 0);
    }

    @Override
    @Transactional
    public SubmissionResponse processSubmission(SubmissionRequest request) {
        // 1. Validation & Retrieval
        StudentExamCode codeEntry = studentExamCodeRepository
                .findByExamCode(request.getExamCode())
                .orElseThrow(() -> new RuntimeException("Invalid examination code: " + request.getExamCode()));

        Test test = testRepository.findById(Objects.requireNonNull(codeEntry.getTestId()))
                .orElseThrow(() -> new RuntimeException("Test not found for code: " + request.getExamCode()));

        // 2. Question Retrieval (Ordered)
        List<Question> questions = getOrderedQuestions(codeEntry, request.getAnswers());

        // 3. Scoring & Breakdown
        int score = 0;
        List<QuestionResult> breakdown = new ArrayList<>();
        Map<Long, String> studentAnswers = request.getAnswers() != null ? request.getAnswers() : new HashMap<>();
        Map<Long, Integer> studentTime = request.getTimeSpent() != null ? request.getTimeSpent() : new HashMap<>();

        for (Question q : questions) {
            String answer = studentAnswers.get(q.getId());
            Integer timeSpent = studentTime.getOrDefault(q.getId(), 0);
            QuestionResult qr = new QuestionResult(q, answer, timeSpent);
            breakdown.add(qr);
            if (qr.isCorrect())
                score++;
        }

        // 4. Persistence
        Submission submission = submissionRepository.findByExamCode(request.getExamCode()).orElse(new Submission());
        updateSubmissionData(submission, request, test, codeEntry, score, questions.size(), breakdown);
        Submission savedSubmission = submissionRepository.save(submission);

        // 5. Status Updates & Notifications
        if (Boolean.TRUE.equals(request.getIsFinal())) {
            codeEntry.setStatus("USED");
            studentExamCodeRepository.save(codeEntry);
            
            updateStudentStatus(codeEntry, test);
            handleNotifications(codeEntry, test, savedSubmission, breakdown);
            checkAutoExpiration(test);
        }

        int totalSeconds = breakdown.stream().mapToInt(QuestionResult::getTimeSpent).sum();
        return new SubmissionResponse(
                new SubmissionDTO(savedSubmission, totalSeconds),
                breakdown,
                Boolean.TRUE.equals(test.getShowResult()),
                Boolean.TRUE.equals(test.getShowAnswers()));
    }

    private List<Question> getOrderedQuestions(StudentExamCode code, Map<Long, String> fallbackIds) {
        List<Question> questions = new ArrayList<>();
        if (code.getAssignedQuestionIds() != null && !code.getAssignedQuestionIds().isEmpty()) {
            String[] ids = code.getAssignedQuestionIds().split(",");
            for (String sId : ids) {
                if (!sId.trim().isEmpty()) {
                    questionRepository.findById(Long.valueOf(sId.trim())).ifPresent(questions::add);
                }
            }
        } else {
            questions = questionRepository.findAllById(fallbackIds.keySet());
        }
        return questions;
    }

    private void updateSubmissionData(Submission s, SubmissionRequest req, Test test, StudentExamCode code, int score,
            int total, List<QuestionResult> breakdown) {
        s.setStudentName(req.getStudentName() != null ? req.getStudentName() : "Guest");
        if (code.getStudentId() != null) {
            studentRepository.findById(code.getStudentId()).ifPresent(student -> s.setStudentEmail(student.getEmail()));
        }
        s.setTestId(test.getId());
        s.setTestName(test.getName());
        s.setStudentId(code.getStudentId());
        s.setExamCode(code.getExamCode());
        s.setScore(score);
        s.setTotalQuestions(total);
        s.setSubmittedAt(LocalDateTime.now());
        s.setAnswersJson("Score: " + score + "/" + total);

        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            s.setDetailedBreakdownJson(mapper.writeValueAsString(breakdown));
        } catch (Exception e) {
            s.setDetailedBreakdownJson("[]");
        }
    }

    private void updateStudentStatus(StudentExamCode code, Test test) {
        studentRepository.findById(code.getStudentId()).ifPresent(student -> {
            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
            String logEntry = String.format("[%s] Status: Took Exam (Exam: %s)", timestamp, test.getName());
            String history = student.getStatusHistory();
            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
            student.setStatus("Took Exam");
            studentRepository.save(student);
        });
    }

    private void handleNotifications(StudentExamCode code, Test test, Submission s, List<QuestionResult> breakdown) {
        studentRepository.findById(code.getStudentId()).ifPresent(student -> {
            if (Boolean.TRUE.equals(test.getShowResult()) || Boolean.TRUE.equals(test.getShowAnswers())) {
                emailService.sendResultEmail(student, test, s, breakdown);
            }
            emailService.sendAdminStudentFinishedNotification(student, test, s, breakdown, code.getStartedAt());
        });
    }

    private void checkAutoExpiration(Test test) {
        List<StudentExamCode> codes = studentExamCodeRepository.findByTestId(test.getId());
        if (!codes.isEmpty()) {
            boolean allFinished = codes.stream().allMatch(c -> "USED".equalsIgnoreCase(c.getStatus()) || "EXPIRED".equalsIgnoreCase(c.getStatus()));
            if (allFinished) {
                test.setStatus("Expired");
                testRepository.save(test);
            }
        }
    }
}
