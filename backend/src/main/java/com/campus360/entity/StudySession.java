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
@Table(name = "study_sessions")
public class StudySession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "course_id")
    private Integer courseId;

    @Column(name = "subject_text", nullable = false)
    private String subjectText;

    @Column(name = "study_time", nullable = false)
    private java.time.LocalDateTime studyTime;

    @Column(name = "peer_limit", nullable = false)
    private Integer peerLimit;

    @Column(name = "tutor_needed", nullable = false)
    private Boolean tutorNeeded;

    @Column(name = "mode", nullable = false)
    private String mode;

    @Column(name = "description")
    private String description;

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
