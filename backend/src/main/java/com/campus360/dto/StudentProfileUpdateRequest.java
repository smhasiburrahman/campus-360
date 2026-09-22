package com.campus360.dto;

import lombok.Data;

@Data
public class StudentProfileUpdateRequest {
    private String fullName;
    private String gender;
    private Long departmentId;
    private String profilePictureUrl;
}

