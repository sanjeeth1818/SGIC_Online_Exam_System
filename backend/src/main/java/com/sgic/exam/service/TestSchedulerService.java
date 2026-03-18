package com.sgic.exam.service;

import com.sgic.exam.model.Student;
import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.StudentRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class TestSchedulerService {

    @Autowired
    private TestRepository testRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Automatically update test statuses based on batch dates and mark absent students.
     */
    @Scheduled(cron = "0 * * * * *") // Run every minute for better feedback during testing
    @Transactional
    public void updateExamStatuses() {
        System.out.println("Running automated exam status and student attendance update...");
        List<Test> tests = testRepository.findAll();
        LocalDate today = LocalDate.now();

        for (Test test : tests) {
            String currentStatus = test.getStatus();
            
            boolean hasTodayBatch = false;
            boolean hasFutureBatch = false;
            boolean allBatchesPast = true;

            if (test.getStudentGroups() != null && !test.getStudentGroups().isEmpty()) {
                for (TestStudentGroup group : test.getStudentGroups()) {
                    String examDate = group.getExamDate();
                    if (examDate == null || examDate.isEmpty())
                        continue;

                    try {
                        LocalDate batchDate = LocalDate.parse(examDate, DATE_FORMATTER);
                        
                        // PROCESS ABSENT STUDENTS FOR PAST BATCHES
                        if (batchDate.isBefore(today)) {
                            processAbsentStudents(test, group);
                        } else if (batchDate.equals(today)) {
                            hasTodayBatch = true;
                            allBatchesPast = false;
                        } else if (batchDate.isAfter(today)) {
                            hasFutureBatch = true;
                            allBatchesPast = false;
                        }
                    } catch (Exception e) {
                        System.err.println("Error parsing date: " + examDate + " for test: " + test.getName());
                    }
                }

                // if ("Expired".equalsIgnoreCase(currentStatus)) continue; // Removed to allow recovery

                String targetStatus = currentStatus;
                
                // Completion Safeguard: If all mapped students have finished, mark as Expired regardless of date
                boolean allFinished = false;
                if (test.getId() != null) {
                    int assignedCount = getAssignedStudentCount(test);
                    long finishedCount = studentExamCodeRepository.findByTestId(test.getId()).stream()
                            .filter(c -> "USED".equalsIgnoreCase(c.getStatus()) || "EXPIRED".equalsIgnoreCase(c.getStatus()))
                            .count();
                    if (finishedCount >= assignedCount && assignedCount > 0) {
                        allFinished = true;
                    }
                }

                if (allFinished) {
                    targetStatus = "Expired";
                } else if (hasTodayBatch) {
                    targetStatus = "Published";
                } else if (allBatchesPast) {
                    targetStatus = "Expired";
                } else if (hasFutureBatch) {
                    targetStatus = "Pending";
                }

                if (!targetStatus.equalsIgnoreCase(currentStatus)) {
                    System.out.println("Auto-updating test '" + test.getName() + "' status from " + currentStatus + " to " + targetStatus);
                    test.setStatus(targetStatus);
                    testRepository.save(test);
                }
            }
        }
    }

    private void processAbsentStudents(Test test, TestStudentGroup group) {
        if (group.getStudents() == null) return;

        for (Student student : group.getStudents()) {
            // Only process students who are currently scheduled (Allocated/Rescheduled) 
            // and haven't finished the exam yet.
            if ("Allocated".equalsIgnoreCase(student.getStatus()) || "Rescheduled".equalsIgnoreCase(student.getStatus())) {
                
                studentExamCodeRepository.findByTestIdAndStudentId(test.getId(), student.getId()).ifPresent(codeEntry -> {
                    // If status is not USED, it means they missed it.
                    if (!"USED".equalsIgnoreCase(codeEntry.getStatus())) {
                        
                        // 1. Mark the specific exam code as EXPIRED
                        codeEntry.setStatus("EXPIRED");
                        studentExamCodeRepository.save(codeEntry);

                        // 2. Mark the student as Absent globally
                        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());
                        String logEntry = String.format("[%s] Status: Absent (Reason: Missed scheduled exam: %s on %s)", 
                                        timestamp, test.getName(), group.getExamDate());
                        
                        String history = student.getStatusHistory();
                        student.setStatusHistory(history == null ? logEntry : logEntry + "\n" + history);
                        student.setStatus("Absent");
                        studentRepository.save(student);

                        System.out.println("Auto-marked student '" + student.getName() + "' as Absent for test: " + test.getName());
                    }
                });
            }
        }
    }
    private int getAssignedStudentCount(Test test) {
        if (test.getStudentGroups() == null) return 0;
        Set<Long> uniqueIds = new java.util.HashSet<>();
        for (com.sgic.exam.model.TestStudentGroup group : test.getStudentGroups()) {
            if (group.getStudents() != null) {
                for (com.sgic.exam.model.Student s : group.getStudents()) {
                    uniqueIds.add(s.getId());
                }
            }
        }
        return uniqueIds.size();
    }
}
