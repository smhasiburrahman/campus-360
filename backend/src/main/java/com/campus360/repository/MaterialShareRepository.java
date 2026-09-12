package com.campus360.repository;

import com.campus360.entity.MaterialShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

@Repository
public interface MaterialShareRepository extends JpaRepository<MaterialShare, Long> {
    Optional<MaterialShare> findByIdAndIsDeletedFalse(Long id);

    @Query("SELECT m FROM MaterialShare m WHERE m.isDeleted = false " +
           "AND (:deptId IS NULL OR m.departmentId = :deptId) " +
           "AND (:courseId IS NULL OR m.courseId = :courseId) " +
           "AND (:trimId IS NULL OR m.trimesterId = :trimId)")
    Page<MaterialShare> findByFilters(@Param("deptId") Integer deptId, 
                                      @Param("courseId") Integer courseId, 
                                      @Param("trimId") Integer trimId, 
                                      Pageable pageable);
}
