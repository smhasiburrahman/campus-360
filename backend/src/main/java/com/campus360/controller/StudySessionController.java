package com.campus360.controller;

import com.campus360.dto.StudySessionParticipantResponse;
import com.campus360.dto.StudySessionRequest;
import com.campus360.dto.StudySessionResponse;
import com.campus360.service.StudySessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/study-sessions")
public class StudySessionController {

    @Autowired
    private StudySessionService studySessionService;

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) return null;
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getAccountType(Authentication authentication) {
        if (authentication == null) return null;
        for (GrantedAuthority auth : authentication.getAuthorities()) {
            String role = auth.getAuthority();
            if (role.startsWith("ROLE_")) {
                String roleName = role.substring(5);
                if (roleName.equals("STUDENT") || roleName.equals("CLUB") || roleName.equals("AUTHORITY") || roleName.equals("DRIVER")) {
                    return roleName;
                }
            }
        }
        return null;
    }

    private String getAdminRole(Authentication authentication) {
        if (authentication == null) return null;
        for (GrantedAuthority auth : authentication.getAuthorities()) {
            if (auth.getAuthority().equals("ROLE_ADMIN")) {
                return "ADMIN";
            }
        }
        return null;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudySessionResponse> createSession(@RequestBody StudySessionRequest request, Authentication authentication) {
        Long studentId = getUserId(authentication);
        StudySessionResponse response = studySessionService.createSession(request, studentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<StudySessionResponse>> getAllSessions(
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) Integer courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Long currentUserId = getUserId(authentication);
        Page<StudySessionResponse> responses = studySessionService.getAllSessions(mode, courseId, PageRequest.of(page, size), currentUserId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudySessionResponse> getSessionById(@PathVariable Long id, Authentication authentication) {
        Long currentUserId = getUserId(authentication);
        return ResponseEntity.ok(studySessionService.getSessionById(id, currentUserId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudySessionResponse> updateSession(
            @PathVariable Long id,
            @RequestBody StudySessionRequest request,
            Authentication authentication) {
        Long studentId = getUserId(authentication);
        return ResponseEntity.ok(studySessionService.updateSession(id, request, studentId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id, Authentication authentication) {
        Long userId = getUserId(authentication);
        String adminRole = getAdminRole(authentication);
        studySessionService.deleteSession(id, userId, adminRole);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/participants")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudySessionParticipantResponse> joinSession(@PathVariable Long id, Authentication authentication) {
        Long studentId = getUserId(authentication);
        StudySessionParticipantResponse response = studySessionService.joinSession(id, studentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{id}/participants/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> leaveSession(@PathVariable Long id, Authentication authentication) {
        Long studentId = getUserId(authentication);
        studySessionService.leaveSession(id, studentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/participants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<StudySessionParticipantResponse>> getSessionParticipants(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        String adminRole = getAdminRole(authentication);
        String accountType = getAccountType(authentication);
        List<StudySessionParticipantResponse> participants = studySessionService.getSessionParticipants(id, userId, adminRole, accountType);
        return ResponseEntity.ok(participants);
    }
}
