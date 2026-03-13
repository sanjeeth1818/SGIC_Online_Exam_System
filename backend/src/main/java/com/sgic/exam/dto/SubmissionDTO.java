package com.sgic.exam.dto;

import com.sgic.exam.model.Submission;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionDTO {
    private Long id;
    private String studentName;
    private String studentEmail;
    private String testName;
    private Long testId;
    private int score;
    private int totalQuestions;
    private String submittedAt;
    private String timeTaken;

    public SubmissionDTO(Submission s, int totalSeconds) {
        this.id = s.getId();
        this.studentName = s.getStudentName();
        this.studentEmail = s.getStudentEmail();
        this.testName = s.getTestName();
        this.testId = s.getTestId();
        this.score = s.getScore();
        this.totalQuestions = s.getTotalQuestions();
        this.submittedAt = s.getSubmittedAt() != null ? s.getSubmittedAt().toString() : "";

        int mins = totalSeconds / 60;
        int secs = totalSeconds % 60;
        this.timeTaken = (mins > 0) ? mins + "m " + secs + "s" : secs + "s";
    }
}
