package com.sgic.exam.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SmtpTestResponse {
    private boolean success;
    private String message;
}
