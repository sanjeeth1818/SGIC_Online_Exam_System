package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "email_configurations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String smtpServer;
    private String smtpPort;
    private String senderEmail;
    private String username;
    private String password;

    // Default config name or identifier if multiple are needed in future
    private String configName = "PRIMARY";
}
