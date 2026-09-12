package com.campus360.repository;

import com.campus360.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findByIdAndIsDeletedFalse(Long id);

    @Query("SELECT e FROM Event e WHERE e.isDeleted = false AND (:upcoming IS NULL OR :upcoming = false OR DATE(e.eventDate) >= CURRENT_DATE)")
    Page<Event> findEvents(@Param("upcoming") Boolean upcoming, Pageable pageable);
}
