package com.campus360.repository;

import com.campus360.entity.LostFoundPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LostFoundPostRepository extends JpaRepository<LostFoundPost, Long> {
    Page<LostFoundPost> findByIsDeletedFalse(Pageable pageable);
    Optional<LostFoundPost> findByIdAndIsDeletedFalse(Long id);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM LostFoundPost p WHERE p.isDeleted = false " +
           "AND (:kind IS NULL OR p.postKind = :kind) " +
           "AND (:status IS NULL OR p.status = :status)")
    Page<LostFoundPost> findByFilters(@org.springframework.data.repository.query.Param("kind") String kind, 
                                      @org.springframework.data.repository.query.Param("status") String status, 
                                      Pageable pageable);
}
