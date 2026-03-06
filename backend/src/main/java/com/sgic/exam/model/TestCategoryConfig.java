package com.sgic.exam.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "test_category_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TestCategoryConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long categoryId;
    private String categoryName;
    private Integer questionCount;
}
