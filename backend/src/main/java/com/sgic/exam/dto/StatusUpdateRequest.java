package com.sgic.exam.dto;

import lombok.Data;

@Data
public class StatusUpdateRequest {
    private String status;
    private String statusComment;
    private String examName;
    private String examDate;
    private String examTime;
    private String rescheduledExamName;
    private String rescheduledExamDate;
    private String rescheduledExamTime;
}
