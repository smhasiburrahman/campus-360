package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BloodBroadcastDto {
    private String patientName;
    private String bloodGroup;
    private Integer unitsNeeded;
    private String hospitalName;
    private String hospitalLocation;
    private String wardBed;
    private String urgencyLevel;
    private String neededDate;
    private String contactNumber;
    private String patientCondition;

    // Generated responses
    private String whatsappText;
    private String facebookText;
    private String smsText;
}
