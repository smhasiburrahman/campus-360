package com.campus360.repository;

import com.campus360.entity.CurriculumCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CurriculumCourseRepository extends JpaRepository<CurriculumCourse, Integer> {
    List<CurriculumCourse> findByDepartmentIdAndIsActiveTrue(Integer departmentId);
    Optional<CurriculumCourse> findByDepartmentIdAndCourseCode(Integer departmentId, String courseCode);
}
