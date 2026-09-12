package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MaterialShareResponse {
    private Long id;
    private OwnerDTO postedBy;
    private String departmentName;
    private String courseName;
    private String trimesterName;
    private String title;
    private String description;
    private Integer visits;
    private LocalDateTime createdAt;
    private List<MaterialFileDTO> files;
}
