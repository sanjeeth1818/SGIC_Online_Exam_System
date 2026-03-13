package com.sgic.exam.service;

import com.sgic.exam.dto.ExamPortalQuestionResponse;
import com.sgic.exam.model.Test;
import java.util.List;
import java.util.Map;

public interface ExamPortalService {
    Test verifyCode(String code);

    Map<String, Object> getResumeState(String code);

    List<ExamPortalQuestionResponse> getQuestionsForTest(String code);
}
