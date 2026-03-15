package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "grading_scales")
public class GradingScale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer minScore;
    
    private String gradeLabel;

    private String colorHex;
}
