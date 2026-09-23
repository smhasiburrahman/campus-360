package com.campus360.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class TrimesterPlanDTO {
    private Long id;
    private Integer trimesterNumber;
    private BigDecimal totalCredits;
    private String reasoning;
    private List<PlanCourseItemDTO> courses;
}
