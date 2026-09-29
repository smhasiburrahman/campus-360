package com.campus360.repository;

import com.campus360.entity.BloodRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BloodRequestRepository extends JpaRepository<BloodRequest, Long> {

    List<BloodRequest> findByStatusOrderByCreatedAtDesc(String status);

    List<BloodRequest> findAllByOrderByCreatedAtDesc();

    List<BloodRequest> findByRequesterIdOrderByCreatedAtDesc(Long requesterId);

    @Query("SELECT r FROM BloodRequest r WHERE (:status IS NULL OR r.status = :status) AND (:bloodGroup IS NULL OR r.bloodGroup = :bloodGroup) ORDER BY CASE WHEN r.urgencyLevel = 'CRITICAL' THEN 1 WHEN r.urgencyLevel = 'SAME_DAY' THEN 2 ELSE 3 END, r.createdAt DESC")
    List<BloodRequest> filterRequests(@Param("status") String status, @Param("bloodGroup") String bloodGroup);
}
