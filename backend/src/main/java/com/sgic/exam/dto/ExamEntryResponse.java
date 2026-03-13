package com.sgic.exam.dto;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
public class ExamEntryResponse {
    private boolean success;
    private String message;
    private Long testId;
    private String testName;
    private Long studentId;
    private Integer additionalTime;
    private LocalDateTime startedAt;
    private String status;
    private boolean isReopened;
    private String sessionToken;
}
