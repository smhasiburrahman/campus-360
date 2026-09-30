package com.campus360.service;

import com.campus360.entity.RouteStop;
import com.campus360.entity.ShuttleTrip;
import com.campus360.repository.ShuttleTripRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ShuttleSimulationService {

    private static final Logger log = LoggerFactory.getLogger(ShuttleSimulationService.class);

    @Autowired
    private ShuttleTripRepository shuttleTripRepository;

    @Autowired
    private ShuttleService shuttleService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Autonomous backend simulation runner.
     * Ticks every 3000ms. Guarantees that active shuttles continuously advance
     * and broadcast live speed/location to student portal and driver dashboard,
     * completely independent of browser tab throttling or Safari battery saver!
     */
    @Scheduled(fixedRate = 3000)
    @Transactional
    public void advanceActiveTrips() {
        List<ShuttleTrip> activeTrips = shuttleTripRepository.findByStatus("active");
        if (activeTrips.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (ShuttleTrip trip : activeTrips) {
            try {
                if (trip.getStartedAt() == null) {
                    trip.setStartedAt(now);
                }

                long elapsedSec = ChronoUnit.SECONDS.between(trip.getStartedAt(), now);

                // Phase 1: 20-second Boarding Delay at origin station
                if (elapsedSec < 20) {
                    trip.setCurrentSpeedKmh(BigDecimal.ZERO);
                    trip.setCurrentHeading(BigDecimal.ZERO);
                    trip.setLocationUpdatedAt(now);
                    shuttleTripRepository.save(trip);
                    messagingTemplate.convertAndSend("/topic/trips/" + trip.getId(), trip);
                    messagingTemplate.convertAndSend("/topic/trips/active", trip);
                    continue;
                }

                // Phase 2: Autonomous transit along exact route corridor
                List<RouteStop> stops = shuttleService.getStopsForRoute(trip.getRouteId());
                if (stops == null || stops.size() < 2) {
                    continue;
                }

                // Realistic duration: ~18 mins = 1080 seconds
                long transitSec = elapsedSec - 20;
                long totalTransitSec = 18 * 60; // 1080 seconds

                if (transitSec >= totalTransitSec) {
                    // Reached destination terminal
                    RouteStop destination = stops.get(stops.size() - 1);
                    trip.setCurrentLatitude(destination.getLatitude());
                    trip.setCurrentLongitude(destination.getLongitude());
                    trip.setCurrentSpeedKmh(BigDecimal.ZERO);
                    trip.setCurrentHeading(BigDecimal.ZERO);
                    trip.setLocationUpdatedAt(now);
                    shuttleTripRepository.save(trip);
                    messagingTemplate.convertAndSend("/topic/trips/" + trip.getId(), trip);
                    messagingTemplate.convertAndSend("/topic/trips/active", trip);
                    continue;
                }

                double progress = (double) transitSec / (double) totalTransitSec;
                int totalSegments = stops.size() - 1;
                double segProgress = progress * totalSegments;
                int currentSegIdx = (int) segProgress;
                double fraction = segProgress - currentSegIdx;

                if (currentSegIdx >= totalSegments) {
                    currentSegIdx = totalSegments - 1;
                    fraction = 1.0;
                }

                RouteStop startStop = stops.get(currentSegIdx);
                RouteStop endStop = stops.get(currentSegIdx + 1);

                BigDecimal deltaLat = endStop.getLatitude().subtract(startStop.getLatitude());
                BigDecimal deltaLng = endStop.getLongitude().subtract(startStop.getLongitude());

                BigDecimal currentLat = startStop.getLatitude().add(deltaLat.multiply(BigDecimal.valueOf(fraction)));
                BigDecimal currentLng = startStop.getLongitude().add(deltaLng.multiply(BigDecimal.valueOf(fraction)));

                // Calculate realistic varying speed: 18 - 24 km/h with natural variation
                double baseSpeed = 19.5 + Math.sin(transitSec / 6.0) * 3.5;
                BigDecimal speed = BigDecimal.valueOf(Math.max(12.0, baseSpeed)).setScale(2, RoundingMode.HALF_UP);

                // Calculate heading angle
                double dLng = deltaLng.doubleValue();
                double dLat = deltaLat.doubleValue();
                double heading = Math.toDegrees(Math.atan2(dLng, dLat));
                if (heading < 0) heading += 360;

                trip.setCurrentLatitude(currentLat.setScale(7, RoundingMode.HALF_UP));
                trip.setCurrentLongitude(currentLng.setScale(7, RoundingMode.HALF_UP));
                trip.setCurrentSpeedKmh(speed);
                trip.setCurrentHeading(BigDecimal.valueOf(heading).setScale(2, RoundingMode.HALF_UP));
                trip.setLocationUpdatedAt(now);

                shuttleTripRepository.save(trip);

                // Broadcast over STOMP WebSocket
                messagingTemplate.convertAndSend("/topic/trips/" + trip.getId(), trip);
                messagingTemplate.convertAndSend("/topic/trips/active", trip);

            } catch (Exception ex) {
                log.error("Error advancing simulation for trip #" + trip.getId(), ex);
            }
        }
    }
}
