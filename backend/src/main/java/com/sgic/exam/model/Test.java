package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Test {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String selectionMode;
    private Boolean activateImmediately;

    private String timeMode; // full or question
    private String timeValue;
    private String timeUnit; // mins or seconds

    private String examMode; // scroll or step
    private Boolean showResult;
    private Boolean showAnswers;

    private String status; // Published, Expired, Pending

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private List<TestCategoryConfig> categoryConfigs = new java.util.ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id")
    private List<TestStudentGroup> studentGroups = new java.util.ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "test_manual_questions", joinColumns = @JoinColumn(name = "test_id"), inverseJoinColumns = @JoinColumn(name = "question_id"))
    private List<Question> manualQuestions = new java.util.ArrayList<>();

    private Integer totalQuestions;
    private Integer studentCount = 0;

    @Transient
    private Integer additionalTime = 0;

    @Transient
    private Boolean isReopened = false;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean isDeleted = false;
}
