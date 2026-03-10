package com.sgic.exam.controller;

import com.sgic.exam.model.Category;
import com.sgic.exam.repository.CategoryRepository;
import com.sgic.exam.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.Objects;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @PostMapping
    public Category createCategory(@Valid @RequestBody Category category) {
        if (category.getQuestionCount() == null) {
            category.setQuestionCount(0);
        }
        return categoryRepository.save(category);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Category> updateCategoryStatus(@PathVariable Long id, @RequestBody String status) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        // Sanitize status: remove quotes, braces, or whitespace if sent as raw string
        String cleanStatus = status.replaceAll("[\"{}]", "").trim();

        // Ensure only valid statuses are accepted
        if (cleanStatus.equalsIgnoreCase("Active") || cleanStatus.equalsIgnoreCase("Inactive")) {
            // Standardize casing
            category.setStatus(cleanStatus.substring(0, 1).toUpperCase() + cleanStatus.substring(1).toLowerCase());
        }

        return ResponseEntity.ok(Objects.requireNonNull(categoryRepository.save(category)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable Long id,
            @Valid @RequestBody Category categoryDetails) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        category.setName(categoryDetails.getName());
        category.setDescription(categoryDetails.getDescription());
        if (categoryDetails.getColor() != null) {
            category.setColor(categoryDetails.getColor());
        }
        if (categoryDetails.getStatus() != null) {
            category.setStatus(categoryDetails.getStatus());
        }
        // Do not blindly overwrite questionCount if not provided. In real logic, it
        // might sync from Question table.
        if (categoryDetails.getQuestionCount() != null) {
            category.setQuestionCount(categoryDetails.getQuestionCount());
        }

        final Category updatedCategory = categoryRepository.save(category);
        return ResponseEntity.ok(updatedCategory);
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        // Cascading delete: delete all questions associated with this category
        questionRepository.deleteByCategoryId(id);

        categoryRepository.delete(Objects.requireNonNull(category));
        return ResponseEntity.noContent().build();
    }
}
