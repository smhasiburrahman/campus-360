package com.campus360.service;

import com.campus360.dto.LostFoundPostRequest;
import com.campus360.dto.LostFoundPostResponse;
import com.campus360.dto.LostFoundStatusUpdateRequest;
import com.campus360.entity.LostFoundPost;
import com.campus360.entity.PostImage;
import com.campus360.entity.Student;
import com.campus360.repository.LostFoundPostRepository;
import com.campus360.repository.PostImageRepository;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LostFoundService {

    @Autowired
    private LostFoundPostRepository postRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private StudentRepository studentRepository;

    private LostFoundPostResponse mapToResponse(LostFoundPost post) {
        LostFoundPostResponse response = new LostFoundPostResponse();
        response.setId(post.getId());
        response.setPostKind(post.getPostKind());
        response.setDescription(post.getDescription());
        response.setStatus(post.getStatus());
        response.setCreatedAt(post.getCreatedAt());
        response.setOwnerId(post.getStudentId());

        studentRepository.findById(post.getStudentId()).ifPresent(student -> {
            response.setOwnerName(student.getFullName());
        });

        List<String> images = imageRepository.findByPostTypeAndPostId("lost_found", post.getId())
                .stream()
                .map(PostImage::getImageUrl)
                .collect(Collectors.toList());
        response.setImageUrls(images);

        return response;
    }

    @Transactional
    public LostFoundPostResponse createPost(LostFoundPostRequest request, Long studentId) {
        LostFoundPost post = new LostFoundPost();
        post.setStudentId(studentId);
        post.setPostKind(request.getPostKind());
        post.setDescription(request.getDescription());
        post.setStatus("not_found");
        post.setIsDeleted(false);

        LostFoundPost savedPost = postRepository.save(post);

        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("lost_found");
                image.setPostId(savedPost.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(savedPost);
    }

    public Page<LostFoundPostResponse> getAllPosts(Pageable pageable) {
        return postRepository.findByIsDeletedFalse(pageable).map(this::mapToResponse);
    }

    public LostFoundPostResponse getPostById(Long id) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return mapToResponse(post);
    }

    @Transactional
    public LostFoundPostResponse updatePost(Long id, LostFoundPostRequest request, Long userId, String role) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getStudentId().equals(userId) && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to edit this post");
        }

        post.setPostKind(request.getPostKind());
        post.setDescription(request.getDescription());
        LostFoundPost savedPost = postRepository.save(post);

        // Replace images
        imageRepository.deleteByPostTypeAndPostId("lost_found", savedPost.getId());
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("lost_found");
                image.setPostId(savedPost.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(savedPost);
    }

    @Transactional
    public LostFoundPostResponse updateStatus(Long id, LostFoundStatusUpdateRequest request, Long userId, String accountType, String role) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getStudentId().equals(userId) && !"AUTHORITY".equalsIgnoreCase(accountType)) {
            throw new RuntimeException("Not authorized to update status");
        }

        post.setStatus(request.getStatus());
        post.setStatusUpdatedByType(accountType != null ? accountType.toLowerCase() : "student");
        post.setStatusUpdatedById(userId);
        post.setStatusUpdatedAt(LocalDateTime.now());
        
        return mapToResponse(postRepository.save(post));
    }

    @Transactional
    public void deletePost(Long id, Long userId, String role) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getStudentId().equals(userId) && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to delete this post");
        }

        post.setIsDeleted(true);
        post.setDeletedAt(LocalDateTime.now());
        postRepository.save(post);
    }
}
