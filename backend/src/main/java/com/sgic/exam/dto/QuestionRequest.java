package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class QuestionRequest {
    private Long categoryId;
    private String text;
    private String type;
    private List<String> options;
    private String correctAnswer;
}
