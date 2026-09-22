package com.campus360.service;

import com.campus360.dto.LocationPingRequest;
import com.campus360.dto.RouteStopRequest;
import com.campus360.dto.ShuttleRequest;
import com.campus360.dto.ShuttleRouteRequest;
import com.campus360.dto.ShuttleTripStartRequest;
import com.campus360.entity.*;
import com.campus360.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShuttleService {

    private final ShuttleRouteRepository shuttleRouteRepository;
    private final RouteStopRepository routeStopRepository;
    private final ShuttleRepository shuttleRepository;
    private final ShuttleTripRepository shuttleTripRepository;
    private final ShuttleLocationRepository shuttleLocationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // --- Admin Operations ---

    public ShuttleRoute createRoute(ShuttleRouteRequest request) {
        ShuttleRoute route = new ShuttleRoute();
        route.setName(request.getName());
        route.setDescription(request.getDescription());
        route.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        return shuttleRouteRepository.save(route);
    }

    public RouteStop addStopToRoute(Integer routeId, RouteStopRequest request) {
        ShuttleRoute route = shuttleRouteRepository.findById(routeId)
                .orElseThrow(() -> new RuntimeException("Route not found"));

        RouteStop stop = new RouteStop();
        stop.setRouteId(route.getId());
        stop.setStopName(request.getStopName());
        stop.setSequenceNo(request.getSequenceNo());
        stop.setLatitude(request.getLatitude());
        stop.setLongitude(request.getLongitude());
        return routeStopRepository.save(stop);
    }

    public Shuttle createShuttle(ShuttleRequest request) {
        Shuttle shuttle = new Shuttle();
        shuttle.setVehicleNo(request.getVehicleNo());
        shuttle.setCapacity(request.getCapacity());
        shuttle.setIsActive(true);
        return shuttleRepository.save(shuttle);
    }

    // --- Driver Operations ---

    public ShuttleTrip startTrip(Long driverId, ShuttleTripStartRequest request) {
        ShuttleRoute route = shuttleRouteRepository.findById(request.getRouteId().intValue())
                .orElseThrow(() -> new RuntimeException("Route not found"));

        ShuttleTrip trip = new ShuttleTrip();
        trip.setDriverId(driverId);
        trip.setRouteId(route.getId());
        if (request.getShuttleId() != null) {
            trip.setShuttleId(request.getShuttleId().intValue());
        }
        trip.setStatus("active");
        trip.setStartedAt(LocalDateTime.now());
        return shuttleTripRepository.save(trip);
    }

    @Transactional
    public void updateLocation(Long tripId, Long driverId, LocationPingRequest request) {
        ShuttleTrip trip = shuttleTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        if (!trip.getDriverId().equals(driverId)) {
            throw new RuntimeException("Unauthorized: Not the trip owner");
        }

        // 1. Update Trip cache
        trip.setCurrentLatitude(request.getLatitude());
        trip.setCurrentLongitude(request.getLongitude());
        trip.setCurrentHeading(request.getHeading());
        trip.setCurrentSpeedKmh(request.getSpeedKmh());
        trip.setLocationUpdatedAt(LocalDateTime.now());
        shuttleTripRepository.save(trip);

        // 2. Save history log
        ShuttleLocation locationLog = new ShuttleLocation();
        locationLog.setTripId(trip.getId());
        locationLog.setLatitude(request.getLatitude());
        locationLog.setLongitude(request.getLongitude());
        locationLog.setHeading(request.getHeading());
        locationLog.setSpeedKmh(request.getSpeedKmh());
        locationLog.setRecordedAt(LocalDateTime.now());
        shuttleLocationRepository.save(locationLog);

        // 3. Broadcast to WebSocket
        messagingTemplate.convertAndSend("/topic/trips/" + tripId, trip);
    }

    public ShuttleTrip endTrip(Long tripId, Long driverId) {
        ShuttleTrip trip = shuttleTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        if (!trip.getDriverId().equals(driverId)) {
            throw new RuntimeException("Unauthorized");
        }
        trip.setStatus("completed");
        trip.setEndedAt(LocalDateTime.now());
        return shuttleTripRepository.save(trip);
    }

    // --- Public Operations ---

    public List<ShuttleRoute> getAllRoutes() {
        return shuttleRouteRepository.findAll();
    }

    public List<Shuttle> getAllShuttles() {
        return shuttleRepository.findAll();
    }

    public List<RouteStop> getStopsForRoute(Integer routeId) {
        return routeStopRepository.findAll().stream()
                .filter(s -> s.getRouteId().equals(routeId))
                .collect(Collectors.toList());
    }

    public List<ShuttleTrip> getActiveTrips(Integer routeId) {
        // ideally findByStatusAndRouteId
        return shuttleTripRepository.findAll().stream()
                .filter(t -> "active".equals(t.getStatus()))
                .filter(t -> routeId == null || t.getRouteId().equals(routeId))
                .collect(Collectors.toList());
    }
    
    public ShuttleTrip getTrip(Long tripId) {
        return shuttleTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
    }
}
