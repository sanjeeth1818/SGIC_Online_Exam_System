package com.sgic.exam.repository;

import com.sgic.exam.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByTestId(Long testId);

    Optional<Submission> findByExamCode(String examCode);

    List<Submission> findByStudentId(Long studentId);
}
