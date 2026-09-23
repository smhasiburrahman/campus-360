package com.campus360.repository;

import com.campus360.entity.CoursePlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoursePlanRepository extends JpaRepository<CoursePlan, Long> {
    Page<CoursePlan> findByStudentIdOrderByCreatedAtDesc(Long studentId, Pageable pageable);
    List<CoursePlan> findByStudentIdAndIsActiveTrue(Long studentId);
    Optional<CoursePlan> findByIdAndStudentId(Long id, Long studentId);
}
