package com.campus360.repository;

import com.campus360.entity.ShuttleTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShuttleTripRepository extends JpaRepository<ShuttleTrip, Long> {
}
