package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "blood_requests")
public class BloodRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", insertable = false, updatable = false)
    private Student requester;

    @Column(name = "patient_name", nullable = false)
    private String patientName;

    @Column(name = "blood_group", nullable = false, length = 5)
    private String bloodGroup;

    @Column(name = "units_needed", nullable = false)
    private Integer unitsNeeded = 1;

    @Column(name = "units_fulfilled", nullable = false)
    private Integer unitsFulfilled = 0;

    @Column(name = "hospital_name", nullable = false)
    private String hospitalName;

    @Column(name = "hospital_location", nullable = false)
    private String hospitalLocation;

    @Column(name = "ward_bed")
    private String wardBed;

    @Column(name = "urgency_level", nullable = false, length = 20)
    private String urgencyLevel = "SAME_DAY"; // CRITICAL, SAME_DAY, WITHIN_48H

    @Column(name = "needed_date", nullable = false)
    private LocalDateTime neededDate;

    @Column(name = "contact_number", nullable = false, length = 20)
    private String contactNumber;

    @Column(name = "patient_condition", length = 500)
    private String patientCondition;

    @Column(name = "is_ai_verified", nullable = false)
    private Boolean isAiVerified = false;

    @Column(name = "ai_formatted_broadcast", columnDefinition = "TEXT")
    private String aiFormattedBroadcast;

    @Column(nullable = false, length = 20)
    private String status = "OPEN"; // OPEN, FULFILLED, CLOSED, EXPIRED

    @Column(name = "resolution_source", length = 50)
    private String resolutionSource;

    @Column(name = "resolution_notes", length = 500)
    private String resolutionNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
