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
public class VendorReviewResponse {
    private Long id;
    private Long vendorId;
    private Long reviewerId;
    private String reviewerName;
    private Integer rating;
    private String reviewText;
    private LocalDateTime createdAt;
}

