package com.campus360.dto;

import lombok.Data;

@Data
public class MaterialFileDTO {
    private Long id;
    private String fileUrl;
    private String originalFilename;
    private String fileType;
}
