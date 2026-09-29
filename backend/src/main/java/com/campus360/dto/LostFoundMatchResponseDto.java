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
public class LostFoundMatchResponseDto {
    private Long targetLostPostId;
    private String targetLostTitle;
    private List<LostFoundMatchItemDto> matches;
    private Integer totalCandidatesExamined;
    private String poweredBy;
    private String message;
}
