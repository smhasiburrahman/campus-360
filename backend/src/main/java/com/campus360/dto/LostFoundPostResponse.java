package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class LostFoundPostResponse {
    private Long id;
    private String postKind;
    private String description;
    private String status;
    private Long ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
}
