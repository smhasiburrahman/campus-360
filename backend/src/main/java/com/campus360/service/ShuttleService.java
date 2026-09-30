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
import java.util.Optional;
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

    public Optional<ShuttleTrip> getActiveTripForDriver(Long driverId) {
        return getActiveTripForDriver(driverId, null);
    }

    public Optional<ShuttleTrip> getActiveTripForDriver(Long driverId, Integer shuttleId) {
        if (shuttleId != null) {
            List<ShuttleTrip> shuttleActive = shuttleTripRepository.findByShuttleIdAndStatus(shuttleId, "active");
            return shuttleActive.isEmpty() ? Optional.empty() : Optional.of(shuttleActive.get(0));
        }
        List<ShuttleTrip> activeTrips = shuttleTripRepository.findByDriverIdAndStatus(driverId, "active");
        return activeTrips.isEmpty() ? Optional.empty() : Optional.of(activeTrips.get(0));
    }

    public List<ShuttleTrip> getAllActiveTripsForDriver(Long driverId) {
        return shuttleTripRepository.findByDriverIdAndStatus(driverId, "active");
    }

    public ShuttleTrip startTrip(Long driverId, ShuttleTripStartRequest request) {
        // Enforce: A shuttle vehicle cannot be assigned to multiple active trips
        if (request.getShuttleId() != null) {
            List<ShuttleTrip> existingShuttleActive = shuttleTripRepository.findByShuttleIdAndStatus(request.getShuttleId().intValue(), "active");
            if (!existingShuttleActive.isEmpty()) {
                throw new RuntimeException("This shuttle vehicle is already currently in an active trip (Trip #" + existingShuttleActive.get(0).getId() + "). Please complete or end it before starting a new one.");
            }
        }

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

        // Set initial coordinates to the first stop of the route
        List<RouteStop> stops = getStopsForRoute(route.getId());
        stops.sort(java.util.Comparator.comparing(RouteStop::getSequenceNo));
        if (!stops.isEmpty()) {
            trip.setCurrentLatitude(stops.get(0).getLatitude());
            trip.setCurrentLongitude(stops.get(0).getLongitude());
            trip.setCurrentHeading(java.math.BigDecimal.ZERO);
            trip.setCurrentSpeedKmh(java.math.BigDecimal.ZERO);
            trip.setLocationUpdatedAt(LocalDateTime.now());
        }

        ShuttleTrip savedTrip = shuttleTripRepository.save(trip);
        // Broadcast new trip creation to all connected students
        messagingTemplate.convertAndSend("/topic/trips/active", savedTrip);
        messagingTemplate.convertAndSend("/topic/trips/" + savedTrip.getId(), savedTrip);
        return savedTrip;
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
        messagingTemplate.convertAndSend("/topic/trips/active", trip);
    }

    public ShuttleTrip endTrip(Long tripId, Long driverId) {
        ShuttleTrip trip = shuttleTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        if (!trip.getDriverId().equals(driverId)) {
            throw new RuntimeException("Unauthorized");
        }
        trip.setStatus("completed");
        trip.setEndedAt(LocalDateTime.now());
        ShuttleTrip saved = shuttleTripRepository.save(trip);
        messagingTemplate.convertAndSend("/topic/trips/" + tripId, saved);
        messagingTemplate.convertAndSend("/topic/trips/active", saved);
        return saved;
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
                .sorted(java.util.Comparator.comparing(RouteStop::getSequenceNo))
                .collect(Collectors.toList());
    }

    public List<ShuttleTrip> getActiveTrips(Integer routeId) {
        if (routeId != null) {
            return shuttleTripRepository.findByStatusAndRouteId("active", routeId);
        }
        return shuttleTripRepository.findByStatus("active");
    }
    
    public ShuttleTrip getTrip(Long tripId) {
        return shuttleTripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
    }
}
