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
@Table(name = "marketplace_listings")
public class MarketplaceListing {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "price", nullable = false)
    private java.math.BigDecimal price;

    @Column(name = "status")
    private String status;

    @Column(name = "show_status", nullable = false)
    private Boolean showStatus;

    @Column(name = "contact_enabled", nullable = false)
    private Boolean contactEnabled;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @UpdateTimestamp
    private java.time.LocalDateTime updatedAt;

}
