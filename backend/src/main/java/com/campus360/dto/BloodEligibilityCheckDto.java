package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodEligibilityCheckDto {
    private String query;
    private String bloodGroup;
    private String lastDonationDate;
    private Integer weightKg;
    private String gender;

    // AI Response
    private Boolean eligible;
    private String verdict;
    private String explanation;
    private String nextEligibleDate;
    private String disclaimer;
}
