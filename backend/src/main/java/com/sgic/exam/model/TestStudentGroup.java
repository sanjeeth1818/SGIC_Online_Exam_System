package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Table(name = "test_student_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TestStudentGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String examDate;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "test_student_group_students", joinColumns = @JoinColumn(name = "group_id"), inverseJoinColumns = @JoinColumn(name = "student_id"))
    private List<Student> students;
}
