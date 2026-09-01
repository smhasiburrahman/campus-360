package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "post_comments")
public class PostComment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "post_type", nullable = false)
    private String postType;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "commenter_type", nullable = false)
    private String commenterType;

    @Column(name = "commenter_id", nullable = false)
    private Long commenterId;

    @Column(name = "parent_comment_id")
    private Long parentCommentId;

    @Column(name = "comment_text", nullable = false)
    private String commentText;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private java.time.LocalDateTime updatedAt;

}
