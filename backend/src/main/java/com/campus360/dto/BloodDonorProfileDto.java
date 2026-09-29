package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodDonorProfileDto {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private String universityId;
    private String departmentName;
    private String bloodGroup;
    private Boolean isAvailable;
    private LocalDate lastDonationDate;
    private String contactNumber;
    private String hallOrArea;
    private Integer totalDonations;
    private String notes;
    private Boolean isCooldownOver;
    private Long daysUntilEligible;
    private LocalDateTime createdAt;
}
