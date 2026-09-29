package com.campus360.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LostFoundMatchItemDto {
    private Long postId;
    private String matchLevel;           // "STRONG", "POSSIBLE", "WEAK"
    private Double confidence;           // e.g. 0.92 (0.00 to 1.00)
    private List<String> matchingPoints;
    private List<String> conflictingPoints;
    private String explanation;
    private LostFoundPostResponse foundPost; // Embedded found post details for 1-click display
}
