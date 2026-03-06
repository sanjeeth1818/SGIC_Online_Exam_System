package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentName;
    private Long testId;
    private String testName;

    private Integer score;
    private Integer totalQuestions;

    @Column(columnDefinition = "LONGTEXT")
    private String answersJson; // Simplified summary

    @Column(columnDefinition = "LONGTEXT")
    private String detailedBreakdownJson; // Detailed question-by-question metrics

    private LocalDateTime submittedAt;
}
