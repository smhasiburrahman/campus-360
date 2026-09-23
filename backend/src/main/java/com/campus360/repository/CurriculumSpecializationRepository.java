package com.campus360.repository;

import com.campus360.entity.CurriculumSpecialization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CurriculumSpecializationRepository extends JpaRepository<CurriculumSpecialization, Integer> {
    List<CurriculumSpecialization> findByDepartmentId(Integer departmentId);
}
