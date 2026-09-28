package com.campus360.service;

import com.campus360.dto.ChatMessageDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Dedicated and isolated HTTP client for the Campus 360 AI Chatbot.
 * Strictly uses its own Gemini Free-tier API configuration, completely
 * decoupled from Course Planner or other AI features.
 */
@Component
public class ChatbotGeminiClient {

    private static final Logger log = LoggerFactory.getLogger(ChatbotGeminiClient.class);

    @Value("${gemini.chatbot.api.key:}")
    private String apiKey;

    @Value("${gemini.chatbot.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent}")
    private String apiUrl;

    @Value("${gemini.chatbot.max-tokens:350}")
    private int maxOutputTokens;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatbotGeminiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); // 15 seconds
        factory.setReadTimeout(60000);    // 60 seconds
        this.restTemplate = new RestTemplate(factory);
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.equals("YOUR_CHATBOT_API_KEY_HERE");
    }

    /**
     * Sends a token-optimized multi-turn conversation to the Gemini Free API.
     *
     * @param systemInstruction Short system persona & guidelines (<150 tokens)
     * @param conversationHistory Sliding window of conversation turns
     * @param currentMessage Latest user message
     * @return AI text reply
     * @throws ChatRateLimitException if HTTP 429 is encountered
     */
    public String generateChatReply(String systemInstruction, List<ChatMessageDto> conversationHistory, String currentMessage) {
        if (!isConfigured()) {
            throw new IllegalStateException("Chatbot Gemini API key is not configured. Please set GEMINI_CHATBOT_API_KEY or configure gemini.chatbot.api.key in application.properties.");
        }

        String targetUrl = apiUrl + "?key=" + apiKey.trim();

        // Build contents list
        List<Map<String, Object>> contents = new ArrayList<>();

        if (conversationHistory != null) {
            for (ChatMessageDto msg : conversationHistory) {
                if (msg.getText() != null && !msg.getText().isBlank()) {
                    String role = "model".equalsIgnoreCase(msg.getRole()) ? "model" : "user";
                    contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.getText().trim()))
                    ));
                }
            }
        }

        // Add current user message
        contents.add(Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", currentMessage.trim()))
        ));

        // Build payload
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", contents);

        if (systemInstruction != null && !systemInstruction.isBlank()) {
            requestBody.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemInstruction))
            ));
        }

        requestBody.put("generationConfig", Map.of(
            "temperature", 0.4,
            "topP", 0.9,
            "maxOutputTokens", maxOutputTokens
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String primaryUrl = targetUrl;
        String fallbackUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey.trim();

        List<String> candidateUrls = primaryUrl.equals(fallbackUrl) 
            ? List.of(primaryUrl) 
            : List.of(primaryUrl, fallbackUrl);

        Exception lastException = null;

        for (String url : candidateUrls) {
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        return extractText(response.getBody());
                    }
                } catch (HttpClientErrorException.TooManyRequests e) {
                    log.warn("Gemini Free Tier rate limit reached (HTTP 429): {}", e.getMessage());
                    throw new ChatRateLimitException("Gemini rate limit exceeded. Please wait 30 seconds before sending another message.", 30);
                } catch (HttpServerErrorException.ServiceUnavailable | HttpServerErrorException.InternalServerError e) {
                    lastException = e;
                    log.warn("Gemini service unavailable (attempt {}/2) on URL: {}", attempt, e.getMessage());
                    if (attempt < 2) {
                        try { Thread.sleep(750); } catch (InterruptedException ignored) {}
                    }
                } catch (HttpClientErrorException e) {
                    lastException = e;
                    if (e.getStatusCode().value() == 429) {
                        throw new ChatRateLimitException("Gemini rate limit exceeded. Please wait 30 seconds before sending another message.", 30);
                    }
                    log.error("Gemini client error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
                    break; // Move to fallback url
                } catch (Exception e) {
                    lastException = e;
                    log.warn("Gemini invocation error (attempt {}/2): {}", attempt, e.getMessage());
                    if (attempt < 2) {
                        try { Thread.sleep(500); } catch (InterruptedException ignored) {}
                    }
                }
            }
        }

        if (lastException != null) {
            log.error("Failed to generate AI response after retries: {}", lastException.getMessage());
            throw new RuntimeException("Failed to generate AI response: " + lastException.getMessage(), lastException);
        }

        throw new RuntimeException("Failed to generate AI response: No response received.");
    }

    private String extractText(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
            return "I apologize, but I could not formulate a response. Please try rephrasing your question.";
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    public static class ChatRateLimitException extends RuntimeException {
        private final int retryAfterSeconds;

        public ChatRateLimitException(String message, int retryAfterSeconds) {
            super(message);
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public int getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
