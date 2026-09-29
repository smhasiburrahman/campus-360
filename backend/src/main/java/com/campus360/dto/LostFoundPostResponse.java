package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class LostFoundPostResponse {
    private Long id;
    private String postKind;
    private String title;
    private String description;
    private String lastKnownLocation;
    private String status;
    private Long ownerId;
    private String ownerName;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
    private Integer likeCount = 0;
    private Integer dislikeCount = 0;
    private String userReaction;
    private Integer commentCount = 0;
}
