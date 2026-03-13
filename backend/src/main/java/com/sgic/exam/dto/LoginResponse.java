package com.sgic.exam.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private String message;
    private String token;
    private AdminInfo admin;

    @Data
    @Builder
    public static class AdminInfo {
        private Long id;
        private String username;
        private String email;
        private String name;
    }
}
