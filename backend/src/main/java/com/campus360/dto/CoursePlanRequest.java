package com.campus360.dto;

import lombok.Data;

import java.util.List;

@Data
public class CoursePlanRequest {
    private Integer departmentId;
    private Integer specializationId;
    private Integer currentTrimester = 1;
    private String workloadPref = "balanced";  // light, balanced, heavy
    private String interestText;
    private List<String> completedCourseCodes;  // course codes already passed
    private List<String> avoidCourseCodes;       // courses to exclude
    private List<Integer> skipTrimesters;        // trimesters to take off (summer breaks)
}
