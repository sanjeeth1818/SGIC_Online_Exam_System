package com.sgic.exam.service;

import com.sgic.exam.dto.QuestionRequest;
import com.sgic.exam.model.Category;
import com.sgic.exam.model.Question;
import com.sgic.exam.repository.CategoryRepository;
import com.sgic.exam.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class QuestionServiceImpl implements QuestionService {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Override
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @Override
    public List<Question> getQuestionsByCategory(Long categoryId) {
        return questionRepository.findByCategoryId(categoryId);
    }

    @Override
    @Transactional
    public Question createQuestion(QuestionRequest request) {
        Category category = categoryRepository.findById(Objects.requireNonNull(request.getCategoryId()))
                .orElseThrow(() -> new RuntimeException("Category not found"));

        if (isDuplicateQuestion(category.getId(), request.getText())) {
            throw new IllegalArgumentException("A question with identical text already exists in this category.");
        }

        Question question = new Question();
        question.setCategory(category);
        question.setText(request.getText());
        question.setType(request.getType());
        question.setOptions(request.getOptions());
        question.setCorrectAnswer(request.getCorrectAnswer());

        Question saved = questionRepository.save(question);

        category.setQuestionCount(category.getQuestionCount() + 1);
        categoryRepository.save(category);

        return saved;
    }

    @Override
    @Transactional
    public Question updateQuestion(Long id, QuestionRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        if (!question.getCategory().getId().equals(request.getCategoryId())) {
            // Update old category count
            Category oldCat = question.getCategory();
            oldCat.setQuestionCount(Math.max(0, oldCat.getQuestionCount() - 1));
            categoryRepository.save(oldCat);

            // Update new category count
            Category newCat = categoryRepository.findById(Objects.requireNonNull(request.getCategoryId()))
                    .orElseThrow(() -> new RuntimeException("New category not found"));
            newCat.setQuestionCount(newCat.getQuestionCount() + 1);
            categoryRepository.save(newCat);

            question.setCategory(newCat);
        }

        question.setText(request.getText());
        question.setType(request.getType());
        question.setOptions(request.getOptions());
        question.setCorrectAnswer(request.getCorrectAnswer());

        return questionRepository.save(question);
    }

    @Override
    @Transactional
    public void deleteQuestion(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        Category category = question.getCategory();
        category.setQuestionCount(Math.max(0, category.getQuestionCount() - 1));
        categoryRepository.save(category);

        questionRepository.delete(question);
    }

    @Override
    @Transactional
    public Question updateQuestionStatus(Long id, String status) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + id));

        String cleanStatus = status.replaceAll("[\"{}]", "").trim();
        if (cleanStatus.equalsIgnoreCase("Active") || cleanStatus.equalsIgnoreCase("Inactive")) {
            question.setStatus(cleanStatus.substring(0, 1).toUpperCase() + cleanStatus.substring(1).toLowerCase());
        }
        Question saved = questionRepository.save(question);

        syncCategoryStatus(saved.getCategory());
        return saved;
    }

    @Override
    @Transactional
    public Map<String, Object> bulkUpload(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int rowNumber = 0;

        Map<String, Category> categoryMap = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getName().toLowerCase().trim(), c -> c, (a, b) -> a));

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isHeader = true;
            StringBuilder logicalRow = new StringBuilder();
            boolean inQuotes = false;

            while ((line = reader.readLine()) != null) {
                if (logicalRow.length() > 0) {
                    logicalRow.append("\n");
                }
                logicalRow.append(line);

                // Count quotes to see if the record is complete
                for (int i = 0; i < line.length(); i++) {
                    if (line.charAt(i) == '"') {
                        // Check for escaped quote ""
                        if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                            i++; // Skip escaped quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    }
                }

                if (inQuotes) {
                    continue; // Record spans multiple physical lines
                }

                String rowData = logicalRow.toString();
                logicalRow.setLength(0); // Reset for next logical row
                rowNumber++;

                if (isHeader) {
                    // Remove UTF-8 BOM if present on the first line
                    if (rowData.startsWith("\uFEFF")) {
                        rowData = rowData.substring(1);
                    }
                    isHeader = false;
                    continue;
                }
                if (rowData.trim().isEmpty())
                    continue;

                try {
                    String[] cols = parseCSVLine(rowData);
                    if (cols.length < 4) {
                        errors.add("Row " + rowNumber + ": Not enough columns (found " + cols.length + ")");
                        continue;
                    }

                    String categoryName = cols[0].trim();
                    String type = cols[1].trim();
                    String text = cols[2].trim();

                    if (categoryName.isEmpty() || type.isEmpty() || text.isEmpty()) {
                        errors.add("Row " + rowNumber + ": Missing required fields (Category, Type, or Text)");
                        continue;
                    }

                    // Auto-create category if it doesn't exist
                    Category category = categoryMap.get(categoryName.toLowerCase().trim());
                    if (category == null) {
                        Category newCategory = new Category();
                        newCategory.setName(categoryName);
                        newCategory.setQuestionCount(0);
                        newCategory.setStatus("Active");
                        newCategory.setColor("#1e40af");
                        category = categoryRepository.save(newCategory);
                        // Cache it so later rows in same upload reuse this new category
                        categoryMap.put(categoryName.toLowerCase().trim(), category);
                    }

                    List<String> options = new ArrayList<>();
                    String correctAnswer;

                    if (type.equalsIgnoreCase("MCQ")) {
                        if (cols.length < 8) {
                            errors.add("Row " + rowNumber + ": MCQ requires 8 columns (found " + cols.length + ")");
                            continue;
                        }
                        for (int i = 3; i <= 6; i++)
                            options.add(cols[i].trim());
                        correctAnswer = cols[7].trim();
                    } else {
                        // For Short Answer, correct answer is usually the last column if options are empty
                        correctAnswer = cols[cols.length - 1].trim();
                        if (correctAnswer.isEmpty() && cols.length > 3)
                            correctAnswer = cols[3].trim();
                    }

                    if (correctAnswer.isEmpty()) {
                        errors.add("Row " + rowNumber + ": Missing correct answer");
                        continue;
                    }

                    if (isDuplicateQuestion(category.getId(), text)) {
                        errors.add("Row " + rowNumber + ": Duplicate question in category '" + categoryName + "'");
                        continue;
                    }

                    Question question = new Question();
                    question.setCategory(category);
                    question.setText(text);
                    question.setType(type.equalsIgnoreCase("MCQ") ? "MCQ" : "Short");
                    question.setOptions(options);
                    question.setCorrectAnswer(correctAnswer);
                    questionRepository.save(question);

                    category.setQuestionCount(category.getQuestionCount() + 1);
                    categoryRepository.save(category);
                    successCount++;
                } catch (Exception e) {
                    errors.add("Row " + rowNumber + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to read CSV file: " + e.getMessage());
        }

        result.put("success", true);
        result.put("successCount", successCount);
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        result.put("message", successCount + " questions uploaded successfully.");
        return result;
    }

    @Override
    public String exportToCsv(List<Long> categoryIds) {
        List<Question> questions;
        if (categoryIds == null || categoryIds.isEmpty()) {
            questions = questionRepository.findAll();
        } else {
            questions = questionRepository.findAll().stream()
                .filter(q -> q.getCategory() != null && categoryIds.contains(q.getCategory().getId()))
                .collect(Collectors.toList());
        }

        // Sort by category name, then by question id to keep insertion order within
        // category
        questions.sort(java.util.Comparator
                .comparing((Question q) -> q.getCategory() != null ? q.getCategory().getName() : "")
                .thenComparing(Question::getId));

        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF"); // Add UTF-8 BOM for Excel compatibility
        sb.append("categoryName,type,text,optionA,optionB,optionC,optionD,correctAnswer\n");

        for (Question q : questions) {
            String categoryName = (q.getCategory() != null) ? escapeCsv(q.getCategory().getName()) : "";
            String type = q.getType() != null ? q.getType() : "Short";
            String text = escapeCsv(q.getText());
            String correct = escapeCsv(q.getCorrectAnswer());

            if ("MCQ".equalsIgnoreCase(type) && q.getOptions() != null && q.getOptions().size() >= 4) {
                sb.append(categoryName).append(",")
                        .append(type).append(",")
                        .append(text).append(",")
                        .append(escapeCsv(q.getOptions().get(0))).append(",")
                        .append(escapeCsv(q.getOptions().get(1))).append(",")
                        .append(escapeCsv(q.getOptions().get(2))).append(",")
                        .append(escapeCsv(q.getOptions().get(3))).append(",")
                        .append(correct).append("\n");
            } else {
                // Short answer — leave option columns empty
                sb.append(categoryName).append(",")
                        .append("Short").append(",")
                        .append(text).append(",,,,")
                        .append(correct).append("\n");
            }
        }
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null)
            return "";
        // Wrap in quotes if it contains comma, newline, or quote
        if (value.contains(",") || value.contains("\n") || value.contains("\"")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private boolean isDuplicateQuestion(Long categoryId, String newText) {
        if (newText == null || newText.trim().isEmpty())
            return false;
        String canonicalNew = newText.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        return questionRepository.findByCategoryId(categoryId).stream()
                .anyMatch(q -> q.getText() != null &&
                        canonicalNew.equals(q.getText().replaceAll("[^a-zA-Z0-9]", "").toLowerCase()));
    }

    private void syncCategoryStatus(Category category) {
        if (category == null)
            return;
        List<Question> categoryQuestions = questionRepository.findByCategoryId(category.getId());
        boolean hasActive = categoryQuestions.stream().anyMatch(q -> "Active".equalsIgnoreCase(q.getStatus()));

        if (!hasActive && "Active".equalsIgnoreCase(category.getStatus())) {
            category.setStatus("Inactive");
            categoryRepository.save(category);
        } else if (hasActive && "Inactive".equalsIgnoreCase(category.getStatus())) {
            category.setStatus("Active");
            categoryRepository.save(category);
        }
    }

    private String[] parseCSVLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    // Escaped quote: "" inside a quoted field
                    current.append('"');
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes;
                }
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
}
