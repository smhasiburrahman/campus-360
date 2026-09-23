package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ComplaintResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String title;
    private String category;
    private String location;
    private String description;
    private Boolean isAnonymous;
    private Integer upvoteCount = 0;
    private Integer downvoteCount = 0;
    private Integer commentCount = 0;
    private String userReaction;
    private String status;
    private Long handledBy;
    private LocalDateTime statusUpdatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
