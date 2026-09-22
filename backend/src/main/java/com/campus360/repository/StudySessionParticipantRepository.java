package com.campus360.repository;

import com.campus360.entity.StudySessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudySessionParticipantRepository extends JpaRepository<StudySessionParticipant, Long> {
    long countBySessionId(Long sessionId);
    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);
    List<StudySessionParticipant> findBySessionId(Long sessionId);
    Optional<StudySessionParticipant> findBySessionIdAndStudentId(Long sessionId, Long studentId);
    void deleteBySessionIdAndStudentId(Long sessionId, Long studentId);
}
