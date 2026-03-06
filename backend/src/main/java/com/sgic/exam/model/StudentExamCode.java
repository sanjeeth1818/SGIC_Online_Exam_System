package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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

    private String status = "ACTIVE"; // ACTIVE, USED, EXPIRED

    private String expiryDate; // The date when the code expires (usually the exam date)
}
