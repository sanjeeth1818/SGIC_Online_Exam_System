package com.sgic.exam.repository;

import com.sgic.exam.model.GradingScale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GradingScaleRepository extends JpaRepository<GradingScale, Long> {
}
