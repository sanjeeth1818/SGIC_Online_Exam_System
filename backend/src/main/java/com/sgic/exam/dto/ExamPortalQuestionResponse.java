package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class ExamPortalQuestionResponse {
    private Long id;
    private String text;
    private String type;
    private String categoryName;
    private List<String> options;
}
