package com.campus360.repository;

import com.campus360.entity.ShuttleTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShuttleTripRepository extends JpaRepository<ShuttleTrip, Long> {
    List<ShuttleTrip> findByDriverIdAndStatus(Long driverId, String status);
    List<ShuttleTrip> findByShuttleIdAndStatus(Integer shuttleId, String status);
    List<ShuttleTrip> findByStatus(String status);
    List<ShuttleTrip> findByStatusAndRouteId(String status, Integer routeId);
}
