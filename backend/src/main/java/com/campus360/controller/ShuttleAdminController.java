package com.campus360.controller;

import com.campus360.dto.RouteStopRequest;
import com.campus360.dto.ShuttleRequest;
import com.campus360.dto.ShuttleRouteRequest;
import com.campus360.entity.RouteStop;
import com.campus360.entity.Shuttle;
import com.campus360.entity.ShuttleRoute;
import com.campus360.service.ShuttleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class ShuttleAdminController {

    private final ShuttleService shuttleService;

    @PostMapping("/shuttle-routes")
    @PreAuthorize("hasRole('AUTHORITY')")
    public ResponseEntity<ShuttleRoute> createRoute(@Valid @RequestBody ShuttleRouteRequest request) {
        ShuttleRoute route = shuttleService.createRoute(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(route);
    }

    @PostMapping("/shuttle-routes/{id}/stops")
    @PreAuthorize("hasRole('AUTHORITY')")
    public ResponseEntity<RouteStop> addStop(@PathVariable Integer id, @Valid @RequestBody RouteStopRequest request) {
        RouteStop stop = shuttleService.addStopToRoute(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(stop);
    }

    @PostMapping("/shuttles")
    @PreAuthorize("hasRole('AUTHORITY')")
    public ResponseEntity<Shuttle> createShuttle(@Valid @RequestBody ShuttleRequest request) {
        Shuttle shuttle = shuttleService.createShuttle(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(shuttle);
    }
}
