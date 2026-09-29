package com.campus360.service;

import com.campus360.dto.LostFoundPostRequest;
import com.campus360.dto.LostFoundPostResponse;
import com.campus360.dto.LostFoundStatusUpdateRequest;
import com.campus360.dto.PostCommentDto;
import com.campus360.dto.PostCommentRequest;
import com.campus360.entity.LostFoundPost;
import com.campus360.entity.PostComment;
import com.campus360.entity.PostImage;
import com.campus360.entity.PostLike;
import com.campus360.entity.Student;
import com.campus360.repository.LostFoundPostRepository;
import com.campus360.repository.PostCommentRepository;
import com.campus360.repository.PostImageRepository;
import com.campus360.repository.PostLikeRepository;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LostFoundService {

    @Autowired
    private LostFoundPostRepository postRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private PostCommentRepository postCommentRepository;

    public LostFoundPostResponse mapToResponse(LostFoundPost post) {
        return mapToResponse(post, null);
    }

    public LostFoundPostResponse mapToResponse(LostFoundPost post, Long currentUserId) {
        LostFoundPostResponse response = new LostFoundPostResponse();
        response.setId(post.getId());
        response.setPostKind(post.getPostKind());
        response.setTitle(post.getTitle());
        response.setDescription(post.getDescription());
        response.setLastKnownLocation(post.getLastKnownLocation());
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

        int likes = postLikeRepository.countByPostTypeAndPostIdAndReaction("lost_found", post.getId(), "like");
        int dislikes = postLikeRepository.countByPostTypeAndPostIdAndReaction("lost_found", post.getId(), "dislike");
        int comments = postCommentRepository.countByPostTypeAndPostIdAndIsDeletedFalse("lost_found", post.getId());
        response.setLikeCount(likes);
        response.setDislikeCount(dislikes);
        response.setCommentCount(comments);

        if (currentUserId != null) {
            postLikeRepository.findByPostTypeAndPostIdAndStudentId("lost_found", post.getId(), currentUserId)
                    .ifPresent(pl -> response.setUserReaction(pl.getReaction()));
        }

        return response;
    }

    @Transactional
    public LostFoundPostResponse createPost(LostFoundPostRequest request, Long studentId) {
        LostFoundPost post = new LostFoundPost();
        post.setStudentId(studentId);
        post.setPostKind(request.getPostKind());
        post.setTitle(request.getTitle());
        post.setDescription(request.getDescription());
        post.setLastKnownLocation(request.getLastKnownLocation());
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

    public Page<LostFoundPostResponse> getAllPosts(String kind, String status, Pageable pageable) {
        return getAllPosts(kind, status, pageable, null);
    }

    public Page<LostFoundPostResponse> getAllPosts(String kind, String status, Pageable pageable, Long currentUserId) {
        return postRepository.findByFilters(kind, status, pageable).map(p -> this.mapToResponse(p, currentUserId));
    }

    public LostFoundPostResponse getPostById(Long id) {
        return getPostById(id, null);
    }

    public LostFoundPostResponse getPostById(Long id, Long currentUserId) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return mapToResponse(post, currentUserId);
    }

    @Transactional
    public Map<String, Object> reactToPost(Long postId, String reaction, Long studentId) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        PostLike existing = postLikeRepository.findByPostTypeAndPostIdAndStudentId("lost_found", postId, studentId)
                .orElse(null);

        if (reaction == null || reaction.isBlank()) {
            if (existing != null) {
                postLikeRepository.delete(existing);
            }
        } else {
            String cleanReaction = reaction.toLowerCase().trim();
            if (!cleanReaction.equals("like") && !cleanReaction.equals("dislike")) {
                throw new IllegalArgumentException("Invalid reaction: must be 'like' or 'dislike'");
            }

            if (existing != null) {
                if (existing.getReaction().equalsIgnoreCase(cleanReaction)) {
                    // Clicking the same reaction again toggles it off
                    postLikeRepository.delete(existing);
                } else {
                    // Switching from like to dislike or vice versa (one reaction per person)
                    existing.setReaction(cleanReaction);
                    postLikeRepository.save(existing);
                }
            } else {
                PostLike newLike = new PostLike();
                newLike.setPostType("lost_found");
                newLike.setPostId(postId);
                newLike.setStudentId(studentId);
                newLike.setReaction(cleanReaction);
                postLikeRepository.save(newLike);
            }
        }

        int likes = postLikeRepository.countByPostTypeAndPostIdAndReaction("lost_found", postId, "like");
        int dislikes = postLikeRepository.countByPostTypeAndPostIdAndReaction("lost_found", postId, "dislike");
        String userReaction = postLikeRepository.findByPostTypeAndPostIdAndStudentId("lost_found", postId, studentId)
                .map(PostLike::getReaction).orElse(null);

        return Map.of(
                "likeCount", likes,
                "dislikeCount", dislikes,
                "userReaction", userReaction != null ? userReaction : ""
        );
    }

    public List<PostCommentDto> getPostComments(Long postId) {
        List<PostComment> comments = postCommentRepository.findByPostTypeAndPostIdAndIsDeletedFalseOrderByCreatedAtAsc("lost_found", postId);
        return comments.stream().map(c -> {
            String name = "Student";
            if ("student".equalsIgnoreCase(c.getCommenterType())) {
                name = studentRepository.findById(c.getCommenterId())
                        .map(Student::getFullName)
                        .orElse("Student");
            }
            return PostCommentDto.builder()
                    .id(c.getId())
                    .postId(c.getPostId())
                    .postType(c.getPostType())
                    .commenterId(c.getCommenterId())
                    .commenterName(name)
                    .commenterType(c.getCommenterType())
                    .commentText(c.getCommentText())
                    .createdAt(c.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public PostCommentDto addComment(Long postId, PostCommentRequest request, Long studentId) {
        if (request.getCommentText() == null || request.getCommentText().trim().isEmpty()) {
            throw new IllegalArgumentException("Comment text cannot be empty");
        }

        PostComment comment = new PostComment();
        comment.setPostType("lost_found");
        comment.setPostId(postId);
        comment.setCommenterType("student");
        comment.setCommenterId(studentId);
        comment.setCommentText(request.getCommentText().trim());
        comment.setIsDeleted(false);

        PostComment saved = postCommentRepository.save(comment);

        String studentName = studentRepository.findById(studentId)
                .map(Student::getFullName)
                .orElse("Student");

        return PostCommentDto.builder()
                .id(saved.getId())
                .postId(saved.getPostId())
                .postType(saved.getPostType())
                .commenterId(saved.getCommenterId())
                .commenterName(studentName)
                .commenterType(saved.getCommenterType())
                .commentText(saved.getCommentText())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public LostFoundPostResponse updatePost(Long id, LostFoundPostRequest request, Long userId, String role) {
        LostFoundPost post = postRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getStudentId().equals(userId) && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to edit this post");
        }

        post.setPostKind(request.getPostKind());
        post.setTitle(request.getTitle());
        post.setDescription(request.getDescription());
        post.setLastKnownLocation(request.getLastKnownLocation());
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
