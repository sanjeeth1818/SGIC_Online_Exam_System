package com.sgic.exam.service;

import com.sgic.exam.dto.SubmissionRequest;
import com.sgic.exam.dto.SubmissionResponse;
import com.sgic.exam.model.Submission;
import java.util.List;
import java.util.Map;

public interface SubmissionService {
    List<Submission> getAllSubmissions();

    Map<String, Object> getSubmissionStats();

    SubmissionResponse processSubmission(SubmissionRequest request);
}
