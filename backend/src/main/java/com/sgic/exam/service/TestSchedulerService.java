package com.sgic.exam.service;

import com.sgic.exam.model.Test;
import com.sgic.exam.model.TestStudentGroup;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class TestSchedulerService {

    @Autowired
    private TestRepository testRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Automatically update test statuses based on batch dates.
     * Runs every hour to catch transitions.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void updateExamStatuses() {
        System.out.println("Running automated exam status update scheduler...");
        List<Test> tests = testRepository.findAll();
        LocalDate today = LocalDate.now();

        for (Test test : tests) {
            String currentStatus = test.getStatus();
            if ("Expired".equalsIgnoreCase(currentStatus))
                continue; // Already dead

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
                        if (batchDate.equals(today)) {
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

                String targetStatus = currentStatus;

                if (hasTodayBatch) {
                    targetStatus = "Published";
                } else if (allBatchesPast) {
                    targetStatus = "Expired";
                } else if (hasFutureBatch) {
                    targetStatus = "Draft";
                }

                if (!targetStatus.equalsIgnoreCase(currentStatus)) {
                    System.out.println("Auto-updating test '" + test.getName() + "' status from " + currentStatus
                            + " to " + targetStatus);
                    test.setStatus(targetStatus);
                    testRepository.save(test);
                }
            }
        }
    }
}
