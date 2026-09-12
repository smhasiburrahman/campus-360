package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class MaterialShareRequest {
    private Long departmentId;
    private Long courseId;
    private Long trimesterId;
    private String title;
    private String description;
    private List<MaterialFileDTO> files;
}
