package com.sgic.exam.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class StudentResponse {
    private Long id;
    private String name;
    private String address;
    private String mobileNumber;
    private String nic;
    private String email;
    private LocalDate registeredDate;
    private String status;
    private String statusComment;
    private String statusHistory;
    private String examName;
    private String examDate;
    private String examTime;
    private String examCode;
    private String rescheduledExamName;
    private String rescheduledExamDate;
    private String rescheduledExamTime;
}
