package com.campus360.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CoursePlanResponse {
    private Long id;
    private Long studentId;
    private Integer departmentId;
    private String departmentName;
    private Integer specializationId;
    private String specializationName;
    private Integer currentTrimester;
    private String workloadPref;
    private String interestText;
    private BigDecimal totalCredits;
    private String planSummary;
    private String aiModelUsed;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private List<TrimesterPlanDTO> trimesters;
}
