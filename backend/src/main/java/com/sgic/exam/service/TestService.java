package com.sgic.exam.service;

import com.sgic.exam.dto.TestRequest;
import com.sgic.exam.dto.TestResponse;
import java.util.List;
import java.util.Map;

public interface TestService {
    List<TestResponse> getAllTests();

    TestResponse getTestById(Long id);

    TestResponse createTest(TestRequest request);

    TestResponse updateTest(Long id, TestRequest request);

    void deleteTest(Long id);

    TestResponse updateStatus(Long id, String status);

    List<Map<String, String>> getStudentCodes(Long id);

    TestResponse addExtraTime(Long id, Map<String, Object> payload);
}
