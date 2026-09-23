package com.campus360.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CurriculumCourseDTO {
    private Integer id;
    private String courseCode;
    private String courseName;
    private BigDecimal credits;
    private String category;
    private String subCategory;
}
