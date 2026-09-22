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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudySessionServiceTest {

    @Mock
    private StudySessionRepository studySessionRepository;

    @Mock
    private StudySessionParticipantRepository participantRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private StudySessionService studySessionService;

    private StudySession mockSession;
    private Student mockStudent;
    private Course mockCourse;

    @BeforeEach
    void setUp() {
        mockSession = new StudySession();
        mockSession.setId(1L);
        mockSession.setStudentId(10L);
        mockSession.setCourseId(101);
        mockSession.setSubjectText("Algorithm Analysis");
        mockSession.setStudyTime(LocalDateTime.now().plusDays(2));
        mockSession.setPeerLimit(4);
        mockSession.setTutorNeeded(true);
        mockSession.setMode("offline");
        mockSession.setDescription("Room 402");
        mockSession.setIsDeleted(false);

        mockStudent = new Student();
        mockStudent.setId(10L);
        mockStudent.setFullName("Alice Brown");
        mockStudent.setUniversityId("011211001");
        mockStudent.setEmail("alice@campus360.edu");

        mockCourse = new Course();
        mockCourse.setId(101);
        mockCourse.setCourseCode("CSE221");
        mockCourse.setCourseName("Algorithms");
    }

    @Test
    @DisplayName("Create Study Session - Success")
    void testCreateSession_Success() {
        StudySessionRequest request = new StudySessionRequest();
        request.setCourseId(101);
        request.setSubjectText("Algorithm Analysis");
        request.setStudyTime(mockSession.getStudyTime());
        request.setPeerLimit(4);
        request.setTutorNeeded(true);
        request.setMode("offline");
        request.setDescription("Room 402");

        when(studySessionRepository.save(any(StudySession.class))).thenReturn(mockSession);
        when(studentRepository.findById(10L)).thenReturn(Optional.of(mockStudent));
        when(courseRepository.findById(101L)).thenReturn(Optional.of(mockCourse));
        when(participantRepository.countBySessionId(1L)).thenReturn(0L);

        StudySessionResponse response = studySessionService.createSession(request, 10L);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Algorithm Analysis", response.getSubjectText());
        assertEquals("Alice Brown", response.getStudentName());
        assertEquals("CSE221", response.getCourseCode());
        assertEquals(0L, response.getParticipantCount());
        verify(studySessionRepository, times(1)).save(any(StudySession.class));
    }

    @Test
    @DisplayName("Get All Sessions - Filtered by Mode & Course")
    void testGetAllSessions_Filtered() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<StudySession> page = new PageImpl<>(Collections.singletonList(mockSession));

        when(studySessionRepository.findByIsDeletedFalseAndModeAndCourseId("offline", 101, pageable)).thenReturn(page);
        when(studentRepository.findById(10L)).thenReturn(Optional.of(mockStudent));
        when(courseRepository.findById(101L)).thenReturn(Optional.of(mockCourse));
        when(participantRepository.countBySessionId(1L)).thenReturn(2L);
        when(participantRepository.existsBySessionIdAndStudentId(1L, 10L)).thenReturn(true);

        Page<StudySessionResponse> result = studySessionService.getAllSessions("offline", 101, pageable, 10L);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        StudySessionResponse first = result.getContent().get(0);
        assertEquals(2L, first.getParticipantCount());
        assertTrue(first.getIsJoined());
    }

    @Test
    @DisplayName("Get Session By ID - Not Found")
    void testGetSessionById_NotFound() {
        when(studySessionRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studySessionService.getSessionById(999L, 10L);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    @DisplayName("Update Session - Forbidden for Non-Owner")
    void testUpdateSession_Forbidden() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));

        StudySessionRequest request = new StudySessionRequest();
        request.setSubjectText("Updated Subject");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studySessionService.updateSession(1L, request, 999L);
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("Delete Session - Success by Admin")
    void testDeleteSession_Admin() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));

        studySessionService.deleteSession(1L, 999L, "ADMIN");

        assertTrue(mockSession.getIsDeleted());
        assertNotNull(mockSession.getDeletedAt());
        verify(studySessionRepository).save(mockSession);
    }

    @Test
    @DisplayName("Join Session - Success")
    void testJoinSession_Success() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        when(participantRepository.existsBySessionIdAndStudentId(1L, 25L)).thenReturn(false);
        when(participantRepository.countBySessionId(1L)).thenReturn(2L);

        StudySessionParticipant participant = new StudySessionParticipant();
        participant.setId(50L);
        participant.setSessionId(1L);
        participant.setStudentId(25L);
        participant.setJoinedAt(LocalDateTime.now());

        when(participantRepository.save(any(StudySessionParticipant.class))).thenReturn(participant);

        Student joiner = new Student();
        joiner.setId(25L);
        joiner.setFullName("Bob Marley");
        joiner.setEmail("bob@campus360.edu");
        when(studentRepository.findById(25L)).thenReturn(Optional.of(joiner));

        StudySessionParticipantResponse response = studySessionService.joinSession(1L, 25L);

        assertNotNull(response);
        assertEquals(50L, response.getId());
        assertEquals(25L, response.getStudentId());
        assertEquals("Bob Marley", response.getFullName());
    }

    @Test
    @DisplayName("Join Session - Conflict if Already Joined")
    void testJoinSession_AlreadyJoined() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        when(participantRepository.existsBySessionIdAndStudentId(1L, 25L)).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studySessionService.joinSession(1L, 25L);
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Already joined"));
    }

    @Test
    @DisplayName("Join Session - Conflict if Full (Peer Limit Reached)")
    void testJoinSession_PeerLimitReached() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        when(participantRepository.existsBySessionIdAndStudentId(1L, 25L)).thenReturn(false);
        when(participantRepository.countBySessionId(1L)).thenReturn(4L); // peerLimit is 4

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studySessionService.joinSession(1L, 25L);
        });

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertTrue(exception.getReason().contains("peer limit"));
    }

    @Test
    @DisplayName("Leave Session - Success")
    void testLeaveSession_Success() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        StudySessionParticipant participant = new StudySessionParticipant();
        participant.setId(50L);
        participant.setSessionId(1L);
        participant.setStudentId(25L);

        when(participantRepository.findBySessionIdAndStudentId(1L, 25L)).thenReturn(Optional.of(participant));

        studySessionService.leaveSession(1L, 25L);

        verify(participantRepository, times(1)).delete(participant);
    }

    @Test
    @DisplayName("Get Session Participants - Forbidden for Other Students")
    void testGetSessionParticipants_Forbidden() {
        when(studySessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            studySessionService.getSessionParticipants(1L, 999L, null, "STUDENT");
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }
}
