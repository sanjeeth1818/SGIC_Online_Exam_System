package com.sgic.exam.service;

import com.sgic.exam.dto.CategoryRequest;
import com.sgic.exam.model.Category;
import com.sgic.exam.repository.CategoryRepository;
import com.sgic.exam.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Override
    @Transactional
    public Category createCategory(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setColor(request.getColor());
        category.setStatus(request.getStatus() != null ? request.getStatus() : "Active");
        category.setQuestionCount(request.getQuestionCount() != null ? request.getQuestionCount() : 0);

        return categoryRepository.save(category);
    }

    @Override
    @Transactional
    public Category updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        if (request.getName() != null)
            category.setName(request.getName());
        if (request.getDescription() != null)
            category.setDescription(request.getDescription());
        if (request.getColor() != null)
            category.setColor(request.getColor());
        if (request.getStatus() != null)
            category.setStatus(request.getStatus());
        if (request.getQuestionCount() != null)
            category.setQuestionCount(request.getQuestionCount());

        return categoryRepository.save(category);
    }

    @Override
    @Transactional
    public Category updateCategoryStatus(Long id, String status) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        String cleanStatus = status.replaceAll("[\"{}]", "").trim();
        if (cleanStatus.equalsIgnoreCase("Active") || cleanStatus.equalsIgnoreCase("Inactive")) {
            category.setStatus(cleanStatus.substring(0, 1).toUpperCase() + cleanStatus.substring(1).toLowerCase());
        }

        return categoryRepository.save(category);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        // Cascading delete
        questionRepository.deleteByCategoryId(id);

        categoryRepository.delete(category);
    }
}
