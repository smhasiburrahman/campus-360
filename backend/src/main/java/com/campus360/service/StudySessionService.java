package com.campus360.service;

import com.campus360.dto.StudySessionParticipantResponse;
import com.campus360.dto.StudySessionRequest;
import com.campus360.dto.StudySessionResponse;
import com.campus360.entity.Course;
import com.campus360.entity.Student;
import com.campus360.entity.StudySession;
import com.campus360.entity.StudySessionParticipant;
import com.campus360.repository.CourseRepository;
import com.campus360.repository.StudentRepository;
import com.campus360.repository.StudySessionParticipantRepository;
import com.campus360.repository.StudySessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class StudySessionService {

    @Autowired
    private StudySessionRepository studySessionRepository;

    @Autowired
    private StudySessionParticipantRepository participantRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CourseRepository courseRepository;

    public StudySessionResponse createSession(StudySessionRequest request, Long studentId) {
        if (request.getCourseId() != null && !courseRepository.existsById(request.getCourseId().longValue())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
        }

        StudySession session = new StudySession();
        session.setStudentId(studentId);
        session.setCourseId(request.getCourseId());
        session.setSubjectText(request.getSubjectText());
        session.setStudyTime(request.getStudyTime() != null ? request.getStudyTime() : LocalDateTime.now().plusDays(1));
        session.setPeerLimit(request.getPeerLimit() != null ? request.getPeerLimit() : 5);
        session.setTutorNeeded(request.getTutorNeeded() != null ? request.getTutorNeeded() : false);
        session.setMode(request.getMode() != null ? request.getMode() : "offline");
        session.setDescription(request.getDescription());
        session.setIsDeleted(false);

        StudySession saved = studySessionRepository.save(session);
        return mapToResponse(saved, studentId);
    }

    public Page<StudySessionResponse> getAllSessions(String mode, Integer courseId, Pageable pageable, Long currentUserId) {
        Page<StudySession> sessions;
        if (mode != null && !mode.trim().isEmpty() && courseId != null) {
            sessions = studySessionRepository.findByIsDeletedFalseAndModeAndCourseId(mode.trim(), courseId, pageable);
        } else if (mode != null && !mode.trim().isEmpty()) {
            sessions = studySessionRepository.findByIsDeletedFalseAndMode(mode.trim(), pageable);
        } else if (courseId != null) {
            sessions = studySessionRepository.findByIsDeletedFalseAndCourseId(courseId, pageable);
        } else {
            sessions = studySessionRepository.findByIsDeletedFalse(pageable);
        }

        return sessions.map(session -> mapToResponse(session, currentUserId));
    }

    public StudySessionResponse getSessionById(Long id, Long currentUserId) {
        StudySession session = studySessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found");
        }

        return mapToResponse(session, currentUserId);
    }

    public StudySessionResponse updateSession(Long id, StudySessionRequest request, Long studentId) {
        StudySession session = studySessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found");
        }

        if (!session.getStudentId().equals(studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to update this study session");
        }

        if (request.getCourseId() != null) {
            if (!courseRepository.existsById(request.getCourseId().longValue())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
            }
            session.setCourseId(request.getCourseId());
        }
        if (request.getSubjectText() != null) session.setSubjectText(request.getSubjectText());
        if (request.getStudyTime() != null) session.setStudyTime(request.getStudyTime());
        if (request.getPeerLimit() != null) session.setPeerLimit(request.getPeerLimit());
        if (request.getTutorNeeded() != null) session.setTutorNeeded(request.getTutorNeeded());
        if (request.getMode() != null) session.setMode(request.getMode());
        if (request.getDescription() != null) session.setDescription(request.getDescription());

        StudySession updated = studySessionRepository.save(session);
        return mapToResponse(updated, studentId);
    }

    public void deleteSession(Long id, Long userId, String adminRole) {
        StudySession session = studySessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            return;
        }

        if (!session.getStudentId().equals(userId) && !"ADMIN".equals(adminRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this study session");
        }

        session.setIsDeleted(true);
        session.setDeletedAt(LocalDateTime.now());
        studySessionRepository.save(session);
    }

    @Transactional
    public StudySessionParticipantResponse joinSession(Long sessionId, Long studentId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found");
        }

        if (participantRepository.existsBySessionIdAndStudentId(sessionId, studentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already joined this study session");
        }

        long currentParticipants = participantRepository.countBySessionId(sessionId);
        if (session.getPeerLimit() != null && currentParticipants >= session.getPeerLimit()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Study session has reached its peer limit");
        }

        StudySessionParticipant participant = new StudySessionParticipant();
        participant.setSessionId(sessionId);
        participant.setStudentId(studentId);
        participant.setJoinedAt(LocalDateTime.now());

        StudySessionParticipant saved = participantRepository.save(participant);

        return mapToParticipantResponse(saved);
    }

    @Transactional
    public void leaveSession(Long sessionId, Long studentId) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found");
        }

        Optional<StudySessionParticipant> participant = participantRepository.findBySessionIdAndStudentId(sessionId, studentId);
        if (participant.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a participant in this study session");
        }

        participantRepository.delete(participant.get());
    }

    public List<StudySessionParticipantResponse> getSessionParticipants(Long sessionId, Long userId, String adminRole, String accountType) {
        StudySession session = studySessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found"));

        if (Boolean.TRUE.equals(session.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session not found");
        }

        boolean isOwner = session.getStudentId().equals(userId);
        boolean isAdmin = "ADMIN".equals(adminRole);
        boolean isAuthority = "AUTHORITY".equals(accountType);

        if (!isOwner && !isAdmin && !isAuthority) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to view participants roster");
        }

        List<StudySessionParticipant> participants = participantRepository.findBySessionId(sessionId);
        return participants.stream()
                .map(this::mapToParticipantResponse)
                .collect(Collectors.toList());
    }

    private StudySessionResponse mapToResponse(StudySession session, Long currentUserId) {
        StudySessionResponse response = new StudySessionResponse();
        response.setId(session.getId());
        response.setStudentId(session.getStudentId());
        response.setCourseId(session.getCourseId());
        response.setSubjectText(session.getSubjectText());
        response.setStudyTime(session.getStudyTime());
        response.setPeerLimit(session.getPeerLimit());
        response.setTutorNeeded(session.getTutorNeeded());
        response.setMode(session.getMode());
        response.setDescription(session.getDescription());
        response.setCreatedAt(session.getCreatedAt());
        response.setUpdatedAt(session.getUpdatedAt());

        long count = participantRepository.countBySessionId(session.getId());
        response.setParticipantCount(count);

        if (currentUserId != null) {
            response.setIsJoined(participantRepository.existsBySessionIdAndStudentId(session.getId(), currentUserId));
        } else {
            response.setIsJoined(false);
        }

        studentRepository.findById(session.getStudentId()).ifPresent(student -> {
            response.setStudentName(student.getFullName());
            response.setStudentUniversityId(student.getUniversityId());
        });

        if (session.getCourseId() != null) {
            courseRepository.findById(session.getCourseId().longValue()).ifPresent(course -> {
                response.setCourseCode(course.getCourseCode());
                response.setCourseName(course.getCourseName());
            });
        }

        return response;
    }

    private StudySessionParticipantResponse mapToParticipantResponse(StudySessionParticipant participant) {
        StudySessionParticipantResponse response = new StudySessionParticipantResponse();
        response.setId(participant.getId());
        response.setSessionId(participant.getSessionId());
        response.setStudentId(participant.getStudentId());
        response.setJoinedAt(participant.getJoinedAt());

        studentRepository.findById(participant.getStudentId()).ifPresent(student -> {
            response.setFullName(student.getFullName());
            response.setUniversityId(student.getUniversityId());
            response.setEmail(student.getEmail());
        });

        return response;
    }
}
