package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceListingResponse {
    private Long id;
    private VendorSummaryDTO vendor;
    private String description;
    private BigDecimal price;
    private String status;
    private Boolean showStatus;
    private Boolean contactEnabled;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
}

