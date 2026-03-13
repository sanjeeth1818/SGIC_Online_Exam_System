package com.sgic.exam.dto;

import com.sgic.exam.model.Question;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionResult {
    private Long questionId;
    private String questionText;
    private String categoryName;
    private String studentAnswer;
    private String correctAnswer;
    private boolean isCorrect;
    private int timeSpent;

    public QuestionResult(Question q, String studentAnswer, int timeSpent) {
        this.questionId = q.getId();
        this.questionText = q.getText();
        this.categoryName = (q.getCategory() != null) ? q.getCategory().getName() : "Uncategorized";
        this.studentAnswer = studentAnswer;
        this.correctAnswer = q.getCorrectAnswer();
        this.timeSpent = timeSpent;

        String correct = q.getCorrectAnswer();
        this.isCorrect = compareAnswers(studentAnswer, correct);
    }

    private boolean compareAnswers(String s1, String s2) {
        if (s1 == null || s2 == null)
            return false;

        String norm1 = java.text.Normalizer.normalize(s1, java.text.Normalizer.Form.NFC)
                .replaceAll("[\\p{Cntrl}\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}]", "")
                .replaceAll("\\s+", " ").trim();
        String norm2 = java.text.Normalizer.normalize(s2, java.text.Normalizer.Form.NFC)
                .replaceAll("[\\p{Cntrl}\\p{Cc}\\p{Cf}\\p{Co}\\p{Cn}]", "")
                .replaceAll("\\s+", " ").trim();

        if (norm1.equalsIgnoreCase(norm2))
            return true;

        String strict1 = norm1.replaceAll("\\s", "");
        String strict2 = norm2.replaceAll("\\s", "");
        if (!strict1.isEmpty() && strict1.equalsIgnoreCase(strict2))
            return true;

        try {
            String num1 = strict1.replace(",", "");
            String num2 = strict2.replace(",", "");
            double d1 = Double.parseDouble(num1);
            double d2 = Double.parseDouble(num2);
            return d1 == d2;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
