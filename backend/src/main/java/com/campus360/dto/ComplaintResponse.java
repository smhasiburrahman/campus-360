package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ComplaintResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String description;
    private String status;
    private Long handledBy;
    private LocalDateTime statusUpdatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
