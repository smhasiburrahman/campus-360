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
public class ChatResponse {
    private String reply;
    private List<QuickActionDto> suggestedActions;
    private boolean rateLimited;
    private Integer retryAfterSeconds;
}
