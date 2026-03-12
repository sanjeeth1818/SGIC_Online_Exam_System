package com.sgic.exam.repository;

import com.sgic.exam.model.StudentExamCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StudentExamCodeRepository extends JpaRepository<StudentExamCode, Long> {
    Optional<StudentExamCode> findByTestIdAndStudentId(Long testId, Long studentId);

    Optional<StudentExamCode> findByExamCode(String examCode);

    java.util.List<StudentExamCode> findByTestId(Long testId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByTestId(Long testId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    void deleteByStudentId(Long studentId);
}
