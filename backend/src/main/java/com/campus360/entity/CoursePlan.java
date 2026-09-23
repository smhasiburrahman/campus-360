package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "course_plans")
public class CoursePlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "department_id", nullable = false)
    private Integer departmentId;

    @Column(name = "specialization_id")
    private Integer specializationId;

    @Column(name = "current_trimester", nullable = false)
    private Integer currentTrimester = 1;

    @Column(name = "workload_pref", nullable = false)
    private String workloadPref = "balanced";

    @Column(name = "interest_text", columnDefinition = "TEXT")
    private String interestText;

    @Column(name = "total_credits", nullable = false)
    private BigDecimal totalCredits;

    @Column(name = "plan_summary", columnDefinition = "TEXT")
    private String planSummary;

    @Column(name = "ai_model_used")
    private String aiModelUsed;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("trimesterNumber ASC")
    private List<CoursePlanTrimester> trimesters = new ArrayList<>();
}
