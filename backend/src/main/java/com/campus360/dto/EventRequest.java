package com.campus360.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class EventRequest {
    private String title;
    private String description;
    private String time;
    private String location;
    private String organizerDetails;
    private String registrationLink;
    private LocalDateTime eventDate;
    private List<String> imageUrls;
}
