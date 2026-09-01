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
}
