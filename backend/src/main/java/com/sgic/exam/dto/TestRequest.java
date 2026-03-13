package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class TestRequest {
    private String name;
    private String description;
    private String selectionMode;
    private Boolean activateImmediately;
    private Long testId;
    private String timeMode;
    private Object timeValue; // Can be string or int from frontend
    private String timeUnit;
    private String examMode;
    private Boolean showResult;
    private Boolean showAnswers;
    private String status;
    private Integer totalQuestions;
    private List<Long> manualQuestionIds;
    private List<CategoryConfigRequest> categoryConfigs;
    private List<StudentGroupRequest> studentGroups;
}
