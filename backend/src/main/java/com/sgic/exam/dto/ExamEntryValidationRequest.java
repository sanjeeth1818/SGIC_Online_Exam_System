package com.sgic.exam.dto;

import lombok.Data;

@Data
public class ExamEntryValidationRequest {
    private String code;
    private String sessionToken;
}
