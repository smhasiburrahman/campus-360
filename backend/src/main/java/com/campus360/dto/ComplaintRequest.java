package com.campus360.dto;

import lombok.Data;

@Data
public class ComplaintRequest {
    private String title;
    private String category;
    private String location;
    private String description;
    private Boolean isAnonymous;
}
