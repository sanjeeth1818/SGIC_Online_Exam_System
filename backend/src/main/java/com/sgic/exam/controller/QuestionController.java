package com.sgic.exam.controller;

import com.sgic.exam.model.Category;
import com.sgic.exam.model.Question;
import com.sgic.exam.repository.CategoryRepository;
import com.sgic.exam.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @GetMapping("/category/{categoryId}")
    public List<Question> getQuestionsByCategory(@PathVariable Long categoryId) {
        return questionRepository.findByCategoryId(categoryId);
    }

    @PostMapping
    public ResponseEntity<Question> createQuestion(@Valid @RequestBody QuestionRequest questionRequest) {
        Category category = categoryRepository.findById(questionRequest.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Question question = new Question();
        question.setCategory(category);
        question.setText(questionRequest.getText());
        question.setType(questionRequest.getType());
        question.setOptions(questionRequest.getOptions());
        question.setCorrectAnswer(questionRequest.getCorrectAnswer());

        Question savedQuestion = questionRepository.save(question);

        // Update question count in Category
        category.setQuestionCount(category.getQuestionCount() + 1);
        categoryRepository.save(category);

        return ResponseEntity.ok(savedQuestion);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Question> updateQuestion(@PathVariable Long id,
            @Valid @RequestBody QuestionRequest questionRequest) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        // If category changed, update counts
        if (!question.getCategory().getId().equals(questionRequest.getCategoryId())) {
            Category oldCategory = question.getCategory();
            oldCategory.setQuestionCount(Math.max(0, oldCategory.getQuestionCount() - 1));
            categoryRepository.save(oldCategory);

            Category newCategory = categoryRepository.findById(questionRequest.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("New category not found"));
            newCategory.setQuestionCount(newCategory.getQuestionCount() + 1);
            categoryRepository.save(newCategory);

            question.setCategory(newCategory);
        }

        question.setText(questionRequest.getText());
        question.setType(questionRequest.getType());
        question.setOptions(questionRequest.getOptions());
        question.setCorrectAnswer(questionRequest.getCorrectAnswer());

        Question updatedQuestion = questionRepository.save(question);
        return ResponseEntity.ok(updatedQuestion);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Category category = question.getCategory();
        category.setQuestionCount(Math.max(0, category.getQuestionCount() - 1));
        categoryRepository.save(category);

        questionRepository.delete(question);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-upload")
    public ResponseEntity<Map<String, Object>> bulkUpload(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int rowNumber = 0;

        // Cache categories by lowercase name for fast lookup
        List<Category> allCategories = categoryRepository.findAll();
        Map<String, Category> categoryMap = new HashMap<>();
        for (Category c : allCategories) {
            categoryMap.put(c.getName().toLowerCase().trim(), c);
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isHeader = true;

            while ((line = reader.readLine()) != null) {
                rowNumber++;
                // Skip header row
                if (isHeader) {
                    isHeader = false;
                    continue;
                }

                // Skip empty lines
                if (line.trim().isEmpty())
                    continue;

                try {
                    // Parse CSV row (handle commas inside quotes)
                    String[] cols = parseCSVLine(line);

                    if (cols.length < 4) {
                        errors.add("Row " + rowNumber
                                + ": Not enough columns (minimum: categoryName, type, text, correctAnswer)");
                        continue;
                    }

                    String categoryName = cols[0].trim();
                    String type = cols[1].trim();
                    String text = cols[2].trim();

                    // Validate required fields
                    if (categoryName.isEmpty() || type.isEmpty() || text.isEmpty()) {
                        errors.add("Row " + rowNumber + ": Missing required field (categoryName, type, or text)");
                        continue;
                    }

                    // Validate type
                    if (!type.equalsIgnoreCase("MCQ") && !type.equalsIgnoreCase("Short")) {
                        errors.add("Row " + rowNumber + ": Invalid type '" + type + "'. Must be MCQ or Short");
                        continue;
                    }

                    // Lookup category
                    Category category = categoryMap.get(categoryName.toLowerCase().trim());
                    if (category == null) {
                        errors.add("Row " + rowNumber + ": Category '" + categoryName + "' not found");
                        continue;
                    }

                    // Build options and correctAnswer based on type
                    List<String> options = new ArrayList<>();
                    String correctAnswer;

                    if (type.equalsIgnoreCase("MCQ")) {
                        if (cols.length < 8) {
                            errors.add("Row " + rowNumber
                                    + ": MCQ requires 8 columns (categoryName, type, text, optionA, optionB, optionC, optionD, correctAnswer)");
                            continue;
                        }
                        for (int i = 3; i <= 6; i++) {
                            options.add(cols[i].trim());
                        }
                        correctAnswer = cols[7].trim();

                        if (correctAnswer.isEmpty()) {
                            errors.add("Row " + rowNumber + ": Missing correct answer");
                            continue;
                        }
                    } else {
                        // Short answer: correctAnswer is the last non-empty column
                        correctAnswer = cols[cols.length - 1].trim();
                        if (correctAnswer.isEmpty()) {
                            // Try column index 3
                            correctAnswer = cols.length > 3 ? cols[3].trim() : "";
                        }
                        if (correctAnswer.isEmpty()) {
                            errors.add("Row " + rowNumber + ": Missing correct answer for Short type");
                            continue;
                        }
                    }

                    // Create and save the question
                    Question question = new Question();
                    question.setCategory(category);
                    question.setText(text);
                    question.setType(type.equalsIgnoreCase("MCQ") ? "MCQ" : "Short");
                    question.setOptions(options);
                    question.setCorrectAnswer(correctAnswer);
                    questionRepository.save(question);

                    // Update category count
                    category.setQuestionCount(category.getQuestionCount() + 1);
                    categoryRepository.save(category);

                    successCount++;
                } catch (Exception e) {
                    errors.add("Row " + rowNumber + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Failed to read CSV file: " + e.getMessage());
            return ResponseEntity.badRequest().body(result);
        }

        result.put("success", true);
        result.put("successCount", successCount);
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        result.put("message", successCount + " questions uploaded successfully"
                + (errors.isEmpty() ? "." : ", " + errors.size() + " rows had errors."));

        return ResponseEntity.ok(result);
    }

    // Simple CSV line parser that handles quoted fields
    private String[] parseCSVLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }

    // Inner class for Request Body
    @lombok.Data
    public static class QuestionRequest {
        private Long categoryId;
        private String text;
        private String type;
        private List<String> options;
        private String correctAnswer;
    }
}
