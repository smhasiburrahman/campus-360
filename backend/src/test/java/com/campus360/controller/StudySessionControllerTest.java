package com.campus360.controller;

import com.campus360.dto.StudySessionParticipantResponse;
import com.campus360.dto.StudySessionRequest;
import com.campus360.dto.StudySessionResponse;
import com.campus360.service.StudySessionService;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class StudySessionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private StudySessionService studySessionService;

    @InjectMocks
    private StudySessionController studySessionController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(studySessionController).build();
    }

    @Test
    @DisplayName("POST /api/v1/study-sessions - Create Study Session")
    void testCreateSession() throws Exception {
        StudySessionResponse response = new StudySessionResponse();
        response.setId(10L);
        response.setSubjectText("Distributed Systems Review");
        response.setPeerLimit(6);
        response.setMode("online");

        when(studySessionService.createSession(any(StudySessionRequest.class), eq(15L))).thenReturn(response);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "15", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        String requestJson = "{\"subjectText\":\"Distributed Systems Review\",\"peerLimit\":6,\"mode\":\"online\",\"studyTime\":\"2026-09-25T14:00:00\"}";

        mockMvc.perform(post("/api/v1/study-sessions")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.subjectText").value("Distributed Systems Review"));
    }

    @Test
    @DisplayName("GET /api/v1/study-sessions - Paginated Sessions")
    void testGetAllSessions() {
        StudySessionResponse item = new StudySessionResponse();
        item.setId(1L);
        item.setSubjectText("Machine Learning Midterm");
        Page<StudySessionResponse> page = new PageImpl<>(Collections.singletonList(item));

        when(studySessionService.getAllSessions(eq("offline"), eq(101), any(PageRequest.class), eq(15L))).thenReturn(page);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "15", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        ResponseEntity<Page<StudySessionResponse>> response = studySessionController.getAllSessions("offline", 101, 0, 10, auth);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("Machine Learning Midterm", response.getBody().getContent().get(0).getSubjectText());
    }

    @Test
    @DisplayName("GET /api/v1/study-sessions/{id} - Get By ID")
    void testGetSessionById() throws Exception {
        StudySessionResponse item = new StudySessionResponse();
        item.setId(5L);
        item.setSubjectText("Compiler Design");

        when(studySessionService.getSessionById(eq(5L), eq(20L))).thenReturn(item);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "20", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        mockMvc.perform(get("/api/v1/study-sessions/5").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5L))
                .andExpect(jsonPath("$.subjectText").value("Compiler Design"));
    }

    @Test
    @DisplayName("PUT /api/v1/study-sessions/{id} - Update Session")
    void testUpdateSession() throws Exception {
        StudySessionRequest request = new StudySessionRequest();
        request.setSubjectText("Updated Subject");

        StudySessionResponse item = new StudySessionResponse();
        item.setId(5L);
        item.setSubjectText("Updated Subject");

        when(studySessionService.updateSession(eq(5L), any(StudySessionRequest.class), eq(20L))).thenReturn(item);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "20", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        mockMvc.perform(put("/api/v1/study-sessions/5")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"subjectText\":\"Updated Subject\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjectText").value("Updated Subject"));
    }

    @Test
    @DisplayName("DELETE /api/v1/study-sessions/{id} - Delete Session")
    void testDeleteSession() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "20", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        mockMvc.perform(delete("/api/v1/study-sessions/5").principal(auth))
                .andExpect(status().isNoContent());

        verify(studySessionService, times(1)).deleteSession(5L, 20L, "ADMIN");
    }

    @Test
    @DisplayName("POST /api/v1/study-sessions/{id}/participants - Join Session")
    void testJoinSession() throws Exception {
        StudySessionParticipantResponse response = new StudySessionParticipantResponse();
        response.setId(100L);
        response.setSessionId(5L);
        response.setStudentId(30L);

        when(studySessionService.joinSession(eq(5L), eq(30L))).thenReturn(response);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "30", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        mockMvc.perform(post("/api/v1/study-sessions/5/participants").principal(auth))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100L))
                .andExpect(jsonPath("$.studentId").value(30L));
    }

    @Test
    @DisplayName("DELETE /api/v1/study-sessions/{id}/participants/me - Leave Session")
    void testLeaveSession() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "30", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        mockMvc.perform(delete("/api/v1/study-sessions/5/participants/me").principal(auth))
                .andExpect(status().isNoContent());

        verify(studySessionService, times(1)).leaveSession(5L, 30L);
    }

    @Test
    @DisplayName("GET /api/v1/study-sessions/{id}/participants - Get Participants")
    void testGetParticipants() throws Exception {
        StudySessionParticipantResponse participant = new StudySessionParticipantResponse();
        participant.setId(100L);
        participant.setStudentId(30L);
        participant.setFullName("John Smith");

        when(studySessionService.getSessionParticipants(eq(5L), eq(20L), eq("ADMIN"), eq(null)))
                .thenReturn(List.of(participant));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "20", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        mockMvc.perform(get("/api/v1/study-sessions/5/participants").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100L))
                .andExpect(jsonPath("$[0].fullName").value("John Smith"));
    }
}
