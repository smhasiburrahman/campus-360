package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class EventResponse {
    private Long id;
    private OwnerDTO postedBy;
    private String title;
    private String description;
    private String time;
    private String location;
    private String organizerDetails;
    private String registrationLink;
    private LocalDateTime eventDate;
    private LocalDateTime createdAt;
    private List<String> imageUrls;
}
