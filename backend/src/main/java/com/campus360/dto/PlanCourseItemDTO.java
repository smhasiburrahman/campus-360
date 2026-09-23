package com.campus360.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PlanCourseItemDTO {
    private Long id;
    private Integer curriculumCourseId;
    private String courseCode;
    private String courseName;
    private BigDecimal credits;
    private String category;
}
