package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfileResponse {
    private Long id;
    private String email;
    private String universityId;
    private String fullName;
    private DepartmentDTO department;
    private Long departmentId;
    private String departmentName;
    private String gender;
    private String profilePictureUrl;
    private Boolean onboardingComplete;
    private Boolean isActive;
    private LocalDateTime createdAt;
}

