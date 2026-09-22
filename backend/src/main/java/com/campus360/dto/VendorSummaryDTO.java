package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorSummaryDTO {
    private Long id;
    private String vendorName;
    private BigDecimal avgRating;
    private Integer ratingCount;
}

