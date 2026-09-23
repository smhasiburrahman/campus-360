package com.campus360.repository;

import com.campus360.entity.StudySession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {
    Page<StudySession> findByIsDeletedFalse(Pageable pageable);
    Page<StudySession> findByIsDeletedFalseAndMode(String mode, Pageable pageable);
    Page<StudySession> findByIsDeletedFalseAndCourseId(Integer courseId, Pageable pageable);
    Page<StudySession> findByIsDeletedFalseAndModeAndCourseId(String mode, Integer courseId, Pageable pageable);
    Page<StudySession> findByIsDeletedFalseAndStudentId(Long studentId, Pageable pageable);
}
