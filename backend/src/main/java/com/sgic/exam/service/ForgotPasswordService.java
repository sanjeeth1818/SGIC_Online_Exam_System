package com.sgic.exam.service;

import com.sgic.exam.dto.ForgotPasswordRequest;

public interface ForgotPasswordService {
    void requestOtp(String email);

    void verifyOtp(String email, String otp);

    void resetPassword(ForgotPasswordRequest request);
}
