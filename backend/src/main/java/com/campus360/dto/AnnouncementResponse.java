package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AnnouncementResponse {
    private Long id;
    private OwnerDTO postedBy;
    private String title;
    private String category;
    private String description;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
}
