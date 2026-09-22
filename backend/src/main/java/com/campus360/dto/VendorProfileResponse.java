package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorProfileResponse {
    private Long id;
    private Long studentId;
    private String vendorName;
    private String bio;
    private BigDecimal avgRating;
    private Integer ratingCount;
    private LocalDateTime createdAt;
}

