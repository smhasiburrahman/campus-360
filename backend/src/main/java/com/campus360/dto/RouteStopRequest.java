package com.campus360.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class RouteStopRequest {
    @NotBlank
    private String stopName;
    @NotNull
    private Integer sequenceNo;
    @NotNull
    private BigDecimal latitude;
    @NotNull
    private BigDecimal longitude;
}
