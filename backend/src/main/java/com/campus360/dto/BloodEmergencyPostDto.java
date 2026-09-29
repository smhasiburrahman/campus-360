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
public class BloodEmergencyPostDto {
    private String patientName;
    private String bloodGroup;
    private Integer unitsNeeded;
    private String hospitalName;
    private String hospitalLocation;
    private String wardBed;
    private String urgencyLevel; // CRITICAL, SAME_DAY, WITHIN_48H
    private LocalDateTime neededDate;
    private String contactNumber;
    private String patientCondition;
    private Boolean isAiVerified;
    private String aiFormattedBroadcast;
    private Long requesterId;
}
