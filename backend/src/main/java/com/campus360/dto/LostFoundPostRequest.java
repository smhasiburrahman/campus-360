package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class LostFoundPostRequest {
    private String postKind; // 'lost' or 'found'
    private String description;
    private List<String> imageUrls;
}
