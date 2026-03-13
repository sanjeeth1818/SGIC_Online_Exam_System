package com.sgic.exam.dto;

import lombok.Data;

@Data
public class EmailConfigRequest {
    private String smtpServer;
    private String smtpPort;
    private String senderEmail;
    private String senderName;
    private String username;
    private String password;
}
