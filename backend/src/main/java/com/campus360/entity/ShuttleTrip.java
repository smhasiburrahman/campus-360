package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "shuttle_trips")
public class ShuttleTrip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "route_id", nullable = false)
    private Integer routeId;

    @Column(name = "shuttle_id")
    private Integer shuttleId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "current_latitude")
    private java.math.BigDecimal currentLatitude;

    @Column(name = "current_longitude")
    private java.math.BigDecimal currentLongitude;

    @Column(name = "current_heading")
    private java.math.BigDecimal currentHeading;

    @Column(name = "current_speed_kmh")
    private java.math.BigDecimal currentSpeedKmh;

    @Column(name = "location_updated_at")
    private java.time.LocalDateTime locationUpdatedAt;

    @Column(name = "started_at", nullable = false)
    private java.time.LocalDateTime startedAt;

    @Column(name = "ended_at")
    private java.time.LocalDateTime endedAt;

}
