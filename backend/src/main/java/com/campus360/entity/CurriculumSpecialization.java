package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "curriculum_specializations")
public class CurriculumSpecialization {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "department_id", nullable = false)
    private Integer departmentId;

    @Column(nullable = false)
    private String name;

    @Column(name = "min_courses", nullable = false)
    private Integer minCourses = 4;

    @Column(columnDefinition = "TEXT")
    private String description;
}
