package com.campus360.repository;

import com.campus360.entity.ShuttleRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShuttleRouteRepository extends JpaRepository<ShuttleRoute, Long> {
}
