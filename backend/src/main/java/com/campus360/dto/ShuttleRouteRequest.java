package com.campus360.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShuttleRouteRequest {
    @NotBlank
    private String name;
    private String description;
    private Boolean isActive = true;
}
