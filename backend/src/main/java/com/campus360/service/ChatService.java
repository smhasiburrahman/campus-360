package com.campus360.service;

import com.campus360.dto.ChatMessageDto;
import com.campus360.dto.ChatRequest;
import com.campus360.dto.ChatResponse;
import com.campus360.dto.QuickActionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final int MAX_HISTORY_TURNS = 3; // Keep only last 3 turns to burn minimal tokens

    @Autowired
    private ChatbotGeminiClient chatbotGeminiClient;

    @Autowired
    private CampusKnowledgeService knowledgeService;

    public ChatResponse processChatMessage(ChatRequest request) {
        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            return ChatResponse.builder()
                .reply("How can I assist you with Campus 360 today?")
                .suggestedActions(knowledgeService.extractQuickActions("", ""))
                .build();
        }

        // 1. Sliding window on conversation history to minimize tokens
        List<ChatMessageDto> truncatedHistory = new ArrayList<>();
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            int startIdx = Math.max(0, request.getHistory().size() - (MAX_HISTORY_TURNS * 2));
            truncatedHistory = request.getHistory().subList(startIdx, request.getHistory().size());
        }

        // 2. Build minimal system instruction with selective context
        String systemInstruction = knowledgeService.buildSystemInstruction(userMessage);

        try {
            // If API key is not configured or awaiting live setup, respond naturally with campus guidance
            if (!chatbotGeminiClient.isConfigured()) {
                log.info("Gemini chatbot API key not set. Using built-in campus assistant responses.");
                String reply = generateSmartCampusReply(userMessage);
                List<QuickActionDto> actions = knowledgeService.extractQuickActions(userMessage, reply);
                return ChatResponse.builder()
                    .reply(reply)
                    .suggestedActions(actions)
                    .rateLimited(false)
                    .build();
            }

            // 3. Call dedicated isolated Gemini client
            String reply = chatbotGeminiClient.generateChatReply(systemInstruction, truncatedHistory, userMessage);
            List<QuickActionDto> actions = knowledgeService.extractQuickActions(userMessage, reply);

            return ChatResponse.builder()
                .reply(reply)
                .suggestedActions(actions)
                .rateLimited(false)
                .build();

        } catch (ChatbotGeminiClient.ChatRateLimitException e) {
            log.warn("Gemini Rate limit reached: {}", e.getMessage());
            List<QuickActionDto> actions = knowledgeService.extractQuickActions(userMessage, "");
            return ChatResponse.builder()
                .reply("I'm receiving a lot of questions right now! Please wait a moment, or use these direct campus shortcuts below:")
                .suggestedActions(actions)
                .rateLimited(true)
                .retryAfterSeconds(e.getRetryAfterSeconds())
                .build();

        } catch (Exception e) {
            log.error("Chatbot processing error: {}", e.getMessage(), e);
            List<QuickActionDto> actions = knowledgeService.extractQuickActions(userMessage, "");
            return ChatResponse.builder()
                .reply("I'm having a brief connection issue. Please try again in a moment, or explore the campus sections below:")
                .suggestedActions(actions)
                .rateLimited(false)
                .build();
        }
    }

    private String generateSmartCampusReply(String userMessage) {
        String lower = userMessage.toLowerCase();
        if (lower.matches(".*\\b(hi|hello|hey|greetings|hola|salam|assalamu alaikum)\\b.*")) {
            return "Hello! 👋 I'm **CampusBot**, your Campus 360 assistant. How can I help you today? Feel free to ask about shuttle schedules, course planning, campus events, or student complaints.";
        }
        if (lower.contains("shuttle") || lower.contains("bus") || lower.contains("route")) {
            return "You can view live bus routes, stops, and real-time GPS locations on the **Shuttle Tracking** portal.";
        }
        if (lower.contains("course") || lower.contains("curriculum") || lower.contains("planner") || lower.contains("prerequisite") || lower.contains("credit")) {
            return "You can explore department course roadmaps, verify prerequisites, and generate degree plans using the **Course Planner**.";
        }
        if (lower.contains("event") || lower.contains("club") || lower.contains("fest") || lower.contains("seminar")) {
            return "Stay up to date with club workshops, campus seminars, and university fests on the **Events** board.";
        }
        if (lower.contains("complaint") || lower.contains("report") || lower.contains("issue") || lower.contains("grievance")) {
            return "Students can submit campus complaints, view administrative updates, and upvote important issues on the **Complaints** page.";
        }
        if (lower.contains("lost") || lower.contains("found")) {
            return "Report misplaced items or check if someone found your belongings on the **Lost & Found** page.";
        }
        if (lower.contains("marketplace") || lower.contains("buy") || lower.contains("sell") || lower.contains("book")) {
            return "Buy and sell second-hand academic books, electronics, and study essentials on the **Marketplace**.";
        }
        if (lower.contains("material") || lower.contains("slide") || lower.contains("note")) {
            return "Access past lecture slides, class notes, and study resources shared by peers in **Material Sharing**.";
        }
        return "I'm here to assist you with everything on Campus 360 — including shuttle tracking, course roadmaps, events, and campus complaints. What would you like to know more about?";
    }
}
