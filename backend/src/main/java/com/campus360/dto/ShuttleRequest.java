package com.campus360.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShuttleRequest {
    @NotBlank
    private String vehicleNo;
    private Integer capacity;
}
