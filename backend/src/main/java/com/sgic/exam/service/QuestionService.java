package com.sgic.exam.service;

import com.sgic.exam.dto.QuestionRequest;
import com.sgic.exam.model.Question;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

public interface QuestionService {
    List<Question> getAllQuestions();

    List<Question> getQuestionsByCategory(Long categoryId);

    Question createQuestion(QuestionRequest request);

    Question updateQuestion(Long id, QuestionRequest request);

    void deleteQuestion(Long id);

    Question updateQuestionStatus(Long id, String status);

    Map<String, Object> bulkUpload(MultipartFile file);

    String exportToCsv(Long categoryId);
}
