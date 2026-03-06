package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class TestResponse {
    private Long id;
    private String name;
    private String description;
    private String selectionMode;
    private Boolean activateImmediately;
    private String timeMode;
    private String timeValue;
    private String timeUnit;
    private String examMode;
    private Boolean showResult;
    private Boolean showAnswers;
    private String status;
    private Integer totalQuestions;
    private Integer studentCount;
    private List<CategoryConfigDTO> categoryConfigs;
    private List<StudentGroupDTO> studentGroups;
    private List<QuestionDTO> manualQuestions;

    @Data
    public static class CategoryConfigDTO {
        private Long id;
        private Long categoryId;
        private String categoryName;
        private Integer questionCount;
    }

    @Data
    public static class StudentGroupDTO {
        private Long id;
        private String examDate;
        private List<StudentDTO> students;
    }

    @Data
    public static class StudentDTO {
        private Long id;
        private String name;
        private String email;
        private String status;
    }

    @Data
    public static class QuestionDTO {
        private Long id;
        private String text;
        private String type;
    }
}
