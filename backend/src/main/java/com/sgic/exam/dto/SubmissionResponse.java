package com.sgic.exam.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SubmissionResponse {
    private SubmissionDTO submission;
    private List<QuestionResult> breakdown;
    private boolean showResult;
    private boolean showAnswers;
}
