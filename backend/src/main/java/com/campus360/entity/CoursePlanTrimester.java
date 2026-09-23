package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "course_plan_trimesters")
public class CoursePlanTrimester {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private CoursePlan plan;

    @Column(name = "trimester_number", nullable = false)
    private Integer trimesterNumber;

    @Column(name = "total_credits", nullable = false)
    private BigDecimal totalCredits;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @OneToMany(mappedBy = "planTrimester", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CoursePlanItem> items = new ArrayList<>();
}
