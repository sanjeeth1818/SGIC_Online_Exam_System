package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_exam_codes", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "test_id", "student_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentExamCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_id", nullable = false)
    private Long testId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "exam_code", nullable = false, length = 4)
    private String examCode;

    private String status = "ACTIVE"; // ACTIVE, STARTED, USED, EXPIRED

    private String expiryDate; // The date when the code expires (usually the exam date)

    @Column(name = "additional_time")
    private Integer additionalTime = 0;

    @Column(name = "time_extension_comment", columnDefinition = "TEXT")
    private String timeExtensionComment;

    @Column(name = "assigned_question_ids", columnDefinition = "TEXT")
    private String assignedQuestionIds;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "current_session_token")
    private String currentSessionToken;

    @Column(name = "is_reopened")
    private Boolean isReopened = false;
}
