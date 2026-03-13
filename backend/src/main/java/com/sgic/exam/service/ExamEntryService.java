package com.sgic.exam.service;

import com.sgic.exam.dto.ExamCompleteRequest;
import com.sgic.exam.dto.ExamEntryResponse;
import com.sgic.exam.dto.ExamEntryValidationRequest;
import com.sgic.exam.dto.ExamStartRequest;

public interface ExamEntryService {
    ExamEntryResponse validateCode(ExamEntryValidationRequest request);

    ExamEntryResponse startExam(ExamStartRequest request);

    void completeExam(ExamCompleteRequest request);
}
