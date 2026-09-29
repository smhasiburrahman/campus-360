package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodEmergencyDetailDto {
    private Long id;
    private Long requesterId;
    private String requesterName;
    private String requesterEmail;
    private String patientName;
    private String bloodGroup;
    private Integer unitsNeeded;
    private Integer unitsFulfilled;
    private String hospitalName;
    private String hospitalLocation;
    private String wardBed;
    private String urgencyLevel;
    private LocalDateTime neededDate;
    private String contactNumber;
    private String patientCondition;
    private Boolean isAiVerified;
    private String aiFormattedBroadcast;
    private String status;
    private LocalDateTime createdAt;
    private List<String> compatibleBloodGroups;
    private Long compatibleDonorsCount;
    private String resolutionSource;
    private String resolutionNotes;
}
