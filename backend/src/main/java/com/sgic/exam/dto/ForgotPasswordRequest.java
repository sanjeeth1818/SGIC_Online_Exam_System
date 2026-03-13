package com.sgic.exam.dto;

import lombok.Data;

@Data
public class ForgotPasswordRequest {
    private String email;
    private String otp;
    private String newPassword;
}
