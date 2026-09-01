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
@Table(name = "shuttle_locations")
public class ShuttleLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "latitude", nullable = false)
    private java.math.BigDecimal latitude;

    @Column(name = "longitude", nullable = false)
    private java.math.BigDecimal longitude;

    @Column(name = "heading")
    private java.math.BigDecimal heading;

    @Column(name = "speed_kmh")
    private java.math.BigDecimal speedKmh;

    @Column(name = "recorded_at", nullable = false)
    private java.time.LocalDateTime recordedAt;

}
