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
@Table(name = "route_stops")
public class RouteStop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "route_id", nullable = false)
    private Integer routeId;

    @Column(name = "stop_name", nullable = false)
    private String stopName;

    @Column(name = "sequence_no", nullable = false)
    private Integer sequenceNo;

    @Column(name = "latitude", nullable = false)
    private java.math.BigDecimal latitude;

    @Column(name = "longitude", nullable = false)
    private java.math.BigDecimal longitude;

}
