package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodSlipScanDto {
    private String imageBase64;
    private String mimeType; // e.g. "image/jpeg", "image/png"

    // Extracted response fields
    private String patientName;
    private String bloodGroup;
    private Integer unitsNeeded;
    private String hospitalName;
    private String hospitalLocation;
    private String wardBed;
    private String urgencyLevel;
    private String neededDate;
    private String patientCondition;
    private String rawSummary;
    private Boolean success;
    private String message;
}
