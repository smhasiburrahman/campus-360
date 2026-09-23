package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "specialization_courses")
public class SpecializationCourse {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "specialization_id", nullable = false)
    private Integer specializationId;

    @Column(name = "course_id", nullable = false)
    private Integer courseId;
}
