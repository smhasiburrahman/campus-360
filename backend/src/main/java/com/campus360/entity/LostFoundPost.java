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
@Table(name = "lost_found_posts")
public class LostFoundPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "post_kind", nullable = false)
    private String postKind;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "status_updated_by_type")
    private String statusUpdatedByType;

    @Column(name = "status_updated_by_id")
    private Long statusUpdatedById;

    @Column(name = "status_updated_at")
    private java.time.LocalDateTime statusUpdatedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private java.time.LocalDateTime updatedAt;

}
