package com.sgic.exam.dto;

import lombok.Data;

@Data
public class ExamCompleteRequest {
    private String code;
    private Long testId;
    private Long studentId;
}
