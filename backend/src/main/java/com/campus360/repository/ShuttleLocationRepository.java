package com.campus360.repository;

import com.campus360.entity.ShuttleLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShuttleLocationRepository extends JpaRepository<ShuttleLocation, Long> {
}
