package com.campus360.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StudySessionParticipantResponse {
    private Long id;
    private Long sessionId;
    private Long studentId;
    private String fullName;
    private String universityId;
    private String email;
    private LocalDateTime joinedAt;
}
