package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostCommentDto {
    private Long id;
    private Long postId;
    private String postType;
    private Long commenterId;
    private String commenterName;
    private String commenterType;
    private String commentText;
    private LocalDateTime createdAt;
}
