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
        if (categoryRepository.findByNameIgnoreCase(request.getName().trim()).isPresent()) {
            throw new RuntimeException("Category with name '" + request.getName() + "' already exists.");
        }
        if (categoryRepository.findByColor(request.getColor()).isPresent()) {
            throw new RuntimeException("Category with this color already exists.");
        }

        Category category = new Category();
        category.setName(request.getName().trim());
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

        if (request.getName() != null) {
            String newName = request.getName().trim();
            categoryRepository.findByNameIgnoreCase(newName).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new RuntimeException("Category with name '" + newName + "' already exists.");
                }
            });
            category.setName(newName);
        }
        
        if (request.getColor() != null) {
            categoryRepository.findByColor(request.getColor()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new RuntimeException("Category with this color already exists.");
                }
            });
            category.setColor(request.getColor());
        }

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
