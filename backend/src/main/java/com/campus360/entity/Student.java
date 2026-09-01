package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "university_id", nullable = false, unique = true)
    private String universityId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "department_id")
    private Long departmentId; // Keeping as Long for now, could be @ManyToOne to Department

    @Column
    private String gender;

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "onboarding_complete", nullable = false)
    private Boolean onboardingComplete = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
