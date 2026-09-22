package com.campus360.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StudySessionResponse {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentUniversityId;
    private Integer courseId;
    private String courseCode;
    private String courseName;
    private String subjectText;
    private LocalDateTime studyTime;
    private Integer peerLimit;
    private Boolean tutorNeeded;
    private String mode;
    private String description;
    private Long participantCount;
    private Boolean isJoined;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
