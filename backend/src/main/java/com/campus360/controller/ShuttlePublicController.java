package com.campus360.controller;

import com.campus360.entity.ShuttleRoute;
import com.campus360.entity.ShuttleTrip;
import com.campus360.service.ShuttleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ShuttlePublicController {

    private final ShuttleService shuttleService;

    @GetMapping("/shuttle-routes")
    public ResponseEntity<List<ShuttleRoute>> getRoutes() {
        return ResponseEntity.ok(shuttleService.getAllRoutes());
    }

    @GetMapping("/shuttles")
    public ResponseEntity<List<com.campus360.entity.Shuttle>> getShuttles() {
        return ResponseEntity.ok(shuttleService.getAllShuttles());
    }

    @GetMapping("/shuttle-trips/active")
    public ResponseEntity<List<ShuttleTrip>> getActiveTrips(@RequestParam(required = false) Integer routeId) {
        return ResponseEntity.ok(shuttleService.getActiveTrips(routeId));
    }

    @GetMapping("/shuttle-trips/{id}")
    public ResponseEntity<ShuttleTrip> getTrip(@PathVariable Long id) {
        return ResponseEntity.ok(shuttleService.getTrip(id));
    }
}
