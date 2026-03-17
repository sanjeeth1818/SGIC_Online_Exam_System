package com.sgic.exam.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    private String address;

    @NotBlank(message = "Mobile number is required")
    private String mobileNumber;

    @NotBlank(message = "NIC is required")
    private String nic;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private LocalDate registeredDate;

    private String status = "Pending To Exam";

    private String statusComment;

    private String examName;
    private String examDate;
    private String examTime;
    private String examCode;

    private String rescheduledExamName;
    private String rescheduledExamDate;
    private String rescheduledExamTime;

    @Column(columnDefinition = "TEXT")
    private String statusHistory;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean isDeleted = false;

    @jakarta.persistence.PrePersist
    @jakarta.persistence.PreUpdate
    public void preSave() {
        if (this.isDeleted == null) {
            this.isDeleted = false;
        }
    }
}
