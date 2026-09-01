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
@Table(name = "post_reports")
public class PostReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "post_type", nullable = false)
    private String postType;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "details")
    private String details;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private java.time.LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private java.time.LocalDateTime createdAt;

}
