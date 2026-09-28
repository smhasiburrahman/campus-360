package com.campus360.controller;

import com.campus360.dto.ChatRequest;
import com.campus360.dto.ChatResponse;
import com.campus360.service.ChatService;
import com.campus360.service.ChatbotGeminiClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private ChatbotGeminiClient chatbotGeminiClient;

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(@RequestBody ChatRequest request) {
        ChatResponse response = chatService.processChatMessage(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        return ResponseEntity.ok(Map.of(
            "configured", chatbotGeminiClient.isConfigured(),
            "model", "gemini-2.5-flash",
            "tier", "free-optimized"
        ));
    }
}
