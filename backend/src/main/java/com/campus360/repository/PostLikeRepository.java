package com.campus360.repository;

import com.campus360.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    Optional<PostLike> findByPostTypeAndPostIdAndStudentId(String postType, Long postId, Long studentId);
    int countByPostTypeAndPostIdAndReaction(String postType, Long postId, String reaction);
}
