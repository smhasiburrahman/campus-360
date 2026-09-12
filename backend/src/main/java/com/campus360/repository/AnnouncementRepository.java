package com.campus360.repository;

import com.campus360.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    
    @Query("SELECT a FROM Announcement a WHERE a.isDeleted = false AND (:category IS NULL OR a.category = :category)")
    Page<Announcement> findByIsDeletedFalseAndCategoryOptional(@Param("category") String category, Pageable pageable);

    Page<Announcement> findByIsDeletedFalse(Pageable pageable);
    Optional<Announcement> findByIdAndIsDeletedFalse(Long id);
}
