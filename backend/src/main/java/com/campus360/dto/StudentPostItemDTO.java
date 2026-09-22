package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentPostItemDTO {
    private Long id;
    private String postType;
    private String title;
    private String description;
    private String status;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
    private Long ownerId;
    private String ownerName;
}

