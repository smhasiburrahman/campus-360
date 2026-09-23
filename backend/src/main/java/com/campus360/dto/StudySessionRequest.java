package com.campus360.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StudySessionRequest {
    private Integer courseId;
    private String subjectText;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime studyTime;

    private Integer peerLimit;
    private Boolean tutorNeeded;
    private String mode;
    private String description;
}
