package com.campus360.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class LocationPingRequest {
    @NotNull
    private BigDecimal latitude;
    @NotNull
    private BigDecimal longitude;
    private BigDecimal heading;
    private BigDecimal speedKmh;
}
