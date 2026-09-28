package com.campus360.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatRequest {
    private String message;
    private List<ChatMessageDto> history;
}
