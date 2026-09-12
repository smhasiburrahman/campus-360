package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class AnnouncementRequest {
    private String title;
    private String category;
    private String description;
    private List<String> imageUrls;
}
