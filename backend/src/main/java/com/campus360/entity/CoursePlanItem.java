package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "course_plan_items")
public class CoursePlanItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_trimester_id", nullable = false)
    private CoursePlanTrimester planTrimester;

    @Column(name = "curriculum_course_id", nullable = false)
    private Integer curriculumCourseId;

    @Column(name = "course_code", nullable = false)
    private String courseCode;

    @Column(name = "course_name", nullable = false)
    private String courseName;

    @Column(nullable = false)
    private BigDecimal credits;

    @Column(nullable = false)
    private String category;
}
