package com.campus360.repository;

import com.campus360.entity.PostImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostImageRepository extends JpaRepository<PostImage, Long> {
    List<PostImage> findByPostTypeAndPostId(String postType, Long postId);
    void deleteByPostTypeAndPostId(String postType, Long postId);
}
