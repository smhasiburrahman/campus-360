package com.campus360.repository;

import com.campus360.entity.StudySessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudySessionParticipantRepository extends JpaRepository<StudySessionParticipant, Long> {
}
