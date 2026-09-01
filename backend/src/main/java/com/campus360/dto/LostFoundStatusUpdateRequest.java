package com.campus360.dto;

import lombok.Data;

@Data
public class LostFoundStatusUpdateRequest {
    private String status; // 'found' or 'not_found'
}
