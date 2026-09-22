package com.campus360.dto;

import lombok.Data;

@Data
public class ListingStatusUpdateRequest {
    private String status; // "sold" | "unsold"
    private Boolean showStatus;
}

