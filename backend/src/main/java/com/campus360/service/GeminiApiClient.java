package com.campus360.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * HTTP client for Google Gemini API (generativelanguage.googleapis.com).
 * Sends structured prompts and parses JSON responses.
 */
@Component
public class GeminiApiClient {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiUrl;

    @Value("${gemini.api.max-retries:2}")
    private int maxRetries;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiApiClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); // 15 seconds
        factory.setReadTimeout(90000); // 90 seconds to allow for long JSON generation
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Send a prompt to Gemini and return the text response.
     */
    public String generateContent(String prompt) {
        String url = apiUrl + "?key=" + apiKey;

        // Build request body per Gemini API spec
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "temperature", 0.3,
                "topP", 0.95,
                "maxOutputTokens", 8192,
                "responseMimeType", "application/json"
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String text = extractTextFromResponse(response.getBody());
            try {
                java.nio.file.Files.writeString(java.nio.file.Paths.get("/tmp/gemini_raw_output.txt"), text);
            } catch (Exception ignored) {}
            return text;
        }

        throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode());
    }

    /**
     * Extract the text content from Gemini's response JSON.
     * Response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
     */
    private String extractTextFromResponse(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
            throw new RuntimeException("Unexpected Gemini response structure: " + responseJson.substring(0, Math.min(500, responseJson.length())));
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public String getModelName() {
        // Extract model name from URL
        if (apiUrl.contains("/models/")) {
            String afterModels = apiUrl.substring(apiUrl.indexOf("/models/") + 8);
            return afterModels.contains(":") ? afterModels.substring(0, afterModels.indexOf(":")) : afterModels;
        }
        return "gemini-3.6-flash";
    }
}
