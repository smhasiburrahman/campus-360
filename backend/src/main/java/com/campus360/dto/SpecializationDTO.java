package com.campus360.dto;

import lombok.Data;

@Data
public class SpecializationDTO {
    private Integer id;
    private String name;
    private Integer minCourses;
    private String description;
}
