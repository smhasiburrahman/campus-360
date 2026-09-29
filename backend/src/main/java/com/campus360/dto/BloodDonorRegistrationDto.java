package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodDonorRegistrationDto {
    private Long studentId;
    private String bloodGroup;
    private Boolean isAvailable;
    private LocalDate lastDonationDate;
    private String contactNumber;
    private String hallOrArea;
    private String notes;
}
