package com.campus360.repository;

import com.campus360.entity.CurriculumPrerequisite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CurriculumPrerequisiteRepository extends JpaRepository<CurriculumPrerequisite, Integer> {
    List<CurriculumPrerequisite> findByCourseIdIn(List<Integer> courseIds);
}
