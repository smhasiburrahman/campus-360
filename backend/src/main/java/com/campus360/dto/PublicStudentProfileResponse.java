package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicStudentProfileResponse {
    private Long id;
    private String fullName;
    private DepartmentDTO department;
    private String profilePictureUrl;
}

