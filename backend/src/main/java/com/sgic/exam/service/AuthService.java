package com.sgic.exam.service;

import com.sgic.exam.dto.LoginRequest;
import com.sgic.exam.dto.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
