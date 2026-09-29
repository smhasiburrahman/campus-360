package com.campus360.repository;

import com.campus360.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {
    List<PostComment> findByPostTypeAndPostIdAndIsDeletedFalseOrderByCreatedAtAsc(String postType, Long postId);
    int countByPostTypeAndPostIdAndIsDeletedFalse(String postType, Long postId);
}
