package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class DuplicateCheckResponse {
    private boolean hasDuplicates;
    private List<ComplaintResponse> duplicates;
}
