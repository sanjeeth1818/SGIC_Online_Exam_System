package com.sgic.exam.scheduler;

import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.StudentRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

@Component
public class ExamExpiryScheduler {

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private TestRepository testRepository;

    /**
     * Runs every hour to check for expired exam codes.
     * If a code is still ACTIVE but the expiryDate (exam date) has passed,
     * it marks the code as EXPIRED and the student as ABSENT.
     */
    @Scheduled(cron = "* * * * * *")
    public void checkExpiredCodes() {
        System.out.println("Running Exam Expiry Check...");
        List<StudentExamCode> activeCodes = studentExamCodeRepository.findAll();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (StudentExamCode code : activeCodes) {
            if ("ACTIVE".equalsIgnoreCase(code.getStatus()) && code.getExpiryDate() != null) {
                try {
                    LocalDate expiryDate = LocalDate.parse(code.getExpiryDate(), formatter);
                    if (expiryDate.isBefore(today)) {
                        System.out.println("Expiring code for Student ID: " + code.getStudentId() + " (Expired on "
                                + code.getExpiryDate() + ")");

                        // Mark code as EXPIRED
                        code.setStatus("EXPIRED");
                        studentExamCodeRepository.save(code);

                        // Mark student as ABSENT with detailed history
                        studentRepository.findById(Objects.requireNonNull(code.getStudentId())).ifPresent(student -> {
                            String testName = "Unknown Exam";
                            if (code.getTestId() != null) {
                                testName = testRepository.findById(code.getTestId())
                                        .map(Test::getName)
                                        .orElse("Unknown Exam");
                            }

                            String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                                    .format(new java.util.Date());
                            String logEntry = String.format("[%s] Status: ABSENT (Missed Exam: %s on %s)",
                                    timestamp, testName, code.getExpiryDate());

                            String history = student.getStatusHistory();
                            student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);

                            student.setStatus("ABSENT");
                            studentRepository.save(student);
                            System.out.println("Marked student " + student.getName() + " as ABSENT for " + testName);
                        });
                    }
                } catch (Exception e) {
                    System.err.println(
                            "Failed to parse expiry date '" + code.getExpiryDate() + "' for code ID: " + code.getId());
                }
            }
        }
    }
}
