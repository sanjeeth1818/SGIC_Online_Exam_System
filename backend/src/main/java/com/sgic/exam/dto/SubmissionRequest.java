package com.sgic.exam.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.Map;

@Data
public class SubmissionRequest {
    private String studentName;
    private String examCode;
    private Map<Long, String> answers;
    private Map<Long, Integer> timeSpent;

    @JsonProperty("isFinal")
    private Boolean isFinal;
}
