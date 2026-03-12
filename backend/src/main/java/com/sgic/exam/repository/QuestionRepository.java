package com.sgic.exam.repository;

import com.sgic.exam.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByCategoryId(Long categoryId);

    long countByCategoryId(Long categoryId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(q) > 0 FROM Question q WHERE q.category.id = :categoryId AND TRIM(LOWER(q.text)) = TRIM(LOWER(:text))")
    boolean existsDuplicateInCategory(@org.springframework.data.repository.query.Param("categoryId") Long categoryId,
            @org.springframework.data.repository.query.Param("text") String text);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByCategoryId(Long categoryId);
}
