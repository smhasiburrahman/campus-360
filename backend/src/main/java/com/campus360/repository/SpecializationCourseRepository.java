package com.campus360.repository;

import com.campus360.entity.SpecializationCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecializationCourseRepository extends JpaRepository<SpecializationCourse, Integer> {
    List<SpecializationCourse> findBySpecializationId(Integer specializationId);
}
