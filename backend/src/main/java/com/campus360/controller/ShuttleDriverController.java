package com.campus360.controller;

import com.campus360.dto.LocationPingRequest;
import com.campus360.dto.ShuttleTripStartRequest;
import com.campus360.entity.ShuttleTrip;
import com.campus360.service.ShuttleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/driver/trips")
@RequiredArgsConstructor
public class ShuttleDriverController {

    private final ShuttleService shuttleService;

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ShuttleTrip> startTrip(@Valid @RequestBody ShuttleTripStartRequest request, Authentication authentication) {
        Long driverId = Long.parseLong(authentication.getName());
        ShuttleTrip trip = shuttleService.startTrip(driverId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(trip);
    }

    @PatchMapping("/{tripId}/location")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Void> updateLocation(
            @PathVariable Long tripId,
            @Valid @RequestBody LocationPingRequest request,
            Authentication authentication) {
        Long driverId = Long.parseLong(authentication.getName());
        shuttleService.updateLocation(tripId, driverId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{tripId}/end")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ShuttleTrip> endTrip(@PathVariable Long tripId, Authentication authentication) {
        Long driverId = Long.parseLong(authentication.getName());
        ShuttleTrip trip = shuttleService.endTrip(tripId, driverId);
        return ResponseEntity.ok(trip);
    }
}
