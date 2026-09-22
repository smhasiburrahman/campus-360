package com.campus360.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ShuttleTripStartRequest {
    @NotNull
    private Long routeId;
    private Long shuttleId;
}
