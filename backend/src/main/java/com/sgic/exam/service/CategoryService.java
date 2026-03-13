package com.sgic.exam.service;

import com.sgic.exam.dto.CategoryRequest;
import com.sgic.exam.model.Category;
import java.util.List;

public interface CategoryService {
    List<Category> getAllCategories();

    Category createCategory(CategoryRequest request);

    Category updateCategory(Long id, CategoryRequest request);

    Category updateCategoryStatus(Long id, String status);

    void deleteCategory(Long id);
}
