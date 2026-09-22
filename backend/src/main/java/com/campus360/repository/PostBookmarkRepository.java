package com.campus360.repository;

import com.campus360.entity.PostBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

@Repository
public interface PostBookmarkRepository extends JpaRepository<PostBookmark, Long> {
    Page<PostBookmark> findByStudentId(Long studentId, Pageable pageable);
    Page<PostBookmark> findByStudentIdAndPostType(Long studentId, String postType, Pageable pageable);
    Optional<PostBookmark> findByStudentIdAndPostTypeAndPostId(Long studentId, String postType, Long postId);
    boolean existsByStudentIdAndPostTypeAndPostId(Long studentId, String postType, Long postId);
    void deleteByStudentIdAndPostTypeAndPostId(Long studentId, String postType, Long postId);
}
