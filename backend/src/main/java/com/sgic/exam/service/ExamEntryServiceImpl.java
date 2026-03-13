package com.sgic.exam.service;

import com.sgic.exam.dto.ExamCompleteRequest;
import com.sgic.exam.dto.ExamEntryResponse;
import com.sgic.exam.dto.ExamEntryValidationRequest;
import com.sgic.exam.dto.ExamStartRequest;
import com.sgic.exam.model.StudentExamCode;
import com.sgic.exam.model.Test;
import com.sgic.exam.repository.StudentExamCodeRepository;
import com.sgic.exam.repository.TestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Service
public class ExamEntryServiceImpl implements ExamEntryService {

    @Autowired
    private StudentExamCodeRepository studentExamCodeRepository;

    @Autowired
    private TestRepository testRepository;

    @Override
    public ExamEntryResponse validateCode(ExamEntryValidationRequest request) {
        String code = request.getCode();
        if (code == null || code.length() != 4) {
            return ExamEntryResponse.builder()
                    .success(false)
                    .message("Invalid 4-digit code format.")
                    .build();
        }

        StudentExamCode entry = studentExamCodeRepository.findByExamCode(code)
                .orElse(null);

        if (entry == null) {
            return ExamEntryResponse.builder()
                    .success(false)
                    .message("Invalid Examination Code.")
                    .build();
        }

        // Session Lock Check
        if ("STARTED".equalsIgnoreCase(entry.getStatus()) && !Boolean.TRUE.equals(entry.getIsReopened())) {
            if (entry.getCurrentSessionToken() != null
                    && !entry.getCurrentSessionToken().equals(request.getSessionToken())) {
                return ExamEntryResponse.builder()
                        .success(false)
                        .message("This exam is already in progress in another browser or tab.")
                        .build();
            }
        }

        if ("USED".equalsIgnoreCase(entry.getStatus()) || "EXPIRED".equalsIgnoreCase(entry.getStatus())) {
            return ExamEntryResponse.builder()
                    .success(false)
                    .message("This code has already been used or has expired.")
                    .build();
        }

        Test test = testRepository.findById(Objects.requireNonNull(entry.getTestId())).orElse(null);

        if (test == null || !"Published".equalsIgnoreCase(test.getStatus())) {
            return ExamEntryResponse.builder()
                    .success(false)
                    .message("The examination is not currently available.")
                    .build();
        }

        return ExamEntryResponse.builder()
                .success(true)
                .message("Code valid. You may start the exam.")
                .testId(test.getId())
                .testName(test.getName())
                .studentId(entry.getStudentId())
                .additionalTime(entry.getAdditionalTime() != null ? entry.getAdditionalTime() : 0)
                .startedAt(entry.getStartedAt())
                .status(entry.getStatus())
                .isReopened(Boolean.TRUE.equals(entry.getIsReopened()))
                .build();
    }

    @Override
    @Transactional
    public ExamEntryResponse startExam(ExamStartRequest request) {
        StudentExamCode entry = studentExamCodeRepository.findByExamCode(request.getCode())
                .orElseThrow(() -> new RuntimeException("Invalid Code."));

        if ("USED".equalsIgnoreCase(entry.getStatus())) {
            throw new RuntimeException("Exam already submitted.");
        }

        if ("STARTED".equalsIgnoreCase(entry.getStatus())) {
            if (!entry.getStudentId().equals(request.getStudentId())) {
                throw new RuntimeException("This exam is already in progress on another device/session.");
            }

            // SESSION LOCK CHECK
            if (entry.getCurrentSessionToken() != null
                    && !entry.getCurrentSessionToken().equals(request.getSessionToken())) {
                throw new RuntimeException("This exam is already in progress in another browser or tab.");
            }

            // Allow re-entry for the same student/session
            return ExamEntryResponse.builder()
                    .success(true)
                    .startedAt(entry.getStartedAt())
                    .sessionToken(entry.getCurrentSessionToken())
                    .build();
        }

        // Fresh Start
        String newToken = UUID.randomUUID().toString();
        entry.setStatus("STARTED");
        entry.setStartedAt(LocalDateTime.now());
        entry.setCurrentSessionToken(newToken);
        studentExamCodeRepository.save(entry);

        return ExamEntryResponse.builder()
                .success(true)
                .startedAt(entry.getStartedAt())
                .sessionToken(newToken)
                .build();
    }

    @Override
    @Transactional
    public void completeExam(ExamCompleteRequest request) {
        if (request.getCode() != null) {
            studentExamCodeRepository.findByExamCode(request.getCode()).ifPresent(entry -> {
                entry.setStatus("USED");
                studentExamCodeRepository.save(entry);
            });
        } else if (request.getTestId() != null && request.getStudentId() != null) {
            studentExamCodeRepository.findByTestIdAndStudentId(request.getTestId(), request.getStudentId())
                    .ifPresent(entry -> {
                        entry.setStatus("USED");
                        studentExamCodeRepository.save(entry);
                    });
        }
    }
}
