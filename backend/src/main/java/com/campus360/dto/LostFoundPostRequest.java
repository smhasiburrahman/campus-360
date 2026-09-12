package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class LostFoundPostRequest {
    private String postKind; // 'lost' or 'found'
    private String title;
    private String description;
    private String lastKnownLocation;
    private List<String> imageUrls;
}
