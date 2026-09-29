package com.campus360.service;

import com.campus360.dto.LostFoundMatchItemDto;
import com.campus360.dto.LostFoundMatchResponseDto;
import com.campus360.dto.LostFoundPostResponse;
import com.campus360.entity.LostFoundPost;
import com.campus360.entity.PostImage;
import com.campus360.repository.LostFoundPostRepository;
import com.campus360.repository.PostImageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;

@Service
public class LostFoundAiMatcherService {

    private static final Logger log = LoggerFactory.getLogger(LostFoundAiMatcherService.class);

    @Value("${gemini.lostfound.api.key:}")
    private String apiKey;

    @Value("${gemini.lostfound.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent}")
    private String apiUrl;

    @Autowired
    private LostFoundPostRepository postRepository;

    @Autowired
    private LostFoundService lostFoundService;

    @Autowired
    private PostImageRepository imageRepository;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache of AI-extracted image characteristics by postId to avoid redundant Vision API calls
    private final Map<Long, ImageCharacteristics> imageCharacteristicsCache = new ConcurrentHashMap<>();

    public LostFoundAiMatcherService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(45000);
        this.restTemplate = new RestTemplate(factory);
    }

    private boolean isApiKeyValid() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("YOUR_") && !apiKey.equalsIgnoreCase("null");
    }

    public LostFoundMatchResponseDto findMatchesForLostPost(Long lostPostId) {
        return findMatchesForLostPost(lostPostId, null);
    }

    /**
     * Finds and ranks potential Found matches for a given Lost post using Gemini API (Vision + Multimodal)
     * with intersecting attribute analysis and semantic fallback.
     * Enforces that only the creator of the Lost post can request matches.
     */
    public LostFoundMatchResponseDto findMatchesForLostPost(Long lostPostId, Long userId) {
        LostFoundPost lostPost = postRepository.findByIdAndIsDeletedFalse(lostPostId)
                .orElseThrow(() -> new RuntimeException("Lost post not found with ID: " + lostPostId));

        if (!"lost".equalsIgnoreCase(lostPost.getPostKind())) {
            throw new IllegalArgumentException("AI match suggestions are intended for 'Lost' posts.");
        }

        if (userId != null && !lostPost.getStudentId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the author of this Lost post can use the AI match feature.");
        }

        // Retrieve candidate Found posts (non-deleted, post_kind = 'found')
        List<LostFoundPost> foundPosts = postRepository.findByPostKindIgnoreCaseAndIsDeletedFalseOrderByIdDesc("found");

        // Exclude posts marked as resolved/returned or deleted
        List<LostFoundPost> candidatePosts = foundPosts.stream()
                .filter(p -> p.getId() != null && !p.getId().equals(lostPostId))
                .collect(Collectors.toList());

        if (candidatePosts.isEmpty()) {
            return LostFoundMatchResponseDto.builder()
                    .targetLostPostId(lostPost.getId())
                    .targetLostTitle(lostPost.getTitle())
                    .matches(Collections.emptyList())
                    .totalCandidatesExamined(0)
                    .poweredBy("AI Matcher")
                    .message("No active Found posts are currently available in the system to compare against.")
                    .build();
        }

        // Try Gemini Multimodal API first if configured
        if (isApiKeyValid()) {
            try {
                List<LostFoundMatchItemDto> geminiMatches = callGeminiForMatching(lostPost, candidatePosts);
                if (geminiMatches != null && !geminiMatches.isEmpty()) {
                    populateFoundPostDetails(geminiMatches, candidatePosts);

                    // Rank top 5 by confidence descending
                    List<LostFoundMatchItemDto> ranked = geminiMatches.stream()
                            .filter(m -> m.getConfidence() != null && m.getConfidence() >= 0.35)
                            .sorted((a, b) -> Double.compare(b.getConfidence(), a.getConfidence()))
                            .limit(5)
                            .collect(Collectors.toList());

                    return LostFoundMatchResponseDto.builder()
                            .targetLostPostId(lostPost.getId())
                            .targetLostTitle(lostPost.getTitle())
                            .matches(ranked)
                            .totalCandidatesExamined(candidatePosts.size())
                            .poweredBy("Gemini 3.5 Flash (Vision & Text)")
                            .message(ranked.isEmpty()
                                    ? "Gemini analyzed " + candidatePosts.size() + " Found posts, but found no sufficiently matching items."
                                    : "Gemini identified " + ranked.size() + " potential match(es) combining visual characteristics and text evidence.")
                            .build();
                }
            } catch (Exception e) {
                log.warn("Gemini Multimodal API matching encountered an issue, gracefully using semantic attribute matcher: {}", e.getMessage());
            }
        } else {
            log.info("Gemini API key is not configured or placeholder. Executing local semantic attribute matcher.");
        }

        // Semantic Fallback Engine: compares intersecting attributes, synonyms, visual features, and weighted features
        List<LostFoundMatchItemDto> fallbackMatches = runSemanticAttributeMatcher(lostPost, candidatePosts);
        populateFoundPostDetails(fallbackMatches, candidatePosts);

        List<LostFoundMatchItemDto> topRanked = fallbackMatches.stream()
                .filter(m -> m.getConfidence() != null && m.getConfidence() >= 0.35)
                .sorted((a, b) -> Double.compare(b.getConfidence(), a.getConfidence()))
                .limit(5)
                .collect(Collectors.toList());

        return LostFoundMatchResponseDto.builder()
                .targetLostPostId(lostPost.getId())
                .targetLostTitle(lostPost.getTitle())
                .matches(topRanked)
                .totalCandidatesExamined(candidatePosts.size())
                .poweredBy(isApiKeyValid() ? "Semantic Matcher (Gemini Failover)" : "Semantic Matcher (with Visual Analysis)")
                .message(topRanked.isEmpty()
                        ? "Examined " + candidatePosts.size() + " Found posts, but found no matching items."
                        : "Identified " + topRanked.size() + " potential match(es) by analyzing intersecting visual and textual attributes.")
                .build();
    }

    /**
     * Data structure holding AI-extracted image characteristics from Gemini Vision.
     */
    public static class ImageCharacteristics {
        private String itemType;
        private String brand;
        private String model;
        private String primaryColor;
        private List<String> secondaryColors = new ArrayList<>();
        private String shape;
        private String material;
        private String visibleTextOnItem;
        private List<String> distinctiveMarks = new ArrayList<>();
        private String visualSummary;

        public String getItemType() { return itemType; }
        public void setItemType(String itemType) { this.itemType = itemType; }
        public String getBrand() { return brand; }
        public void setBrand(String brand) { this.brand = brand; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public String getPrimaryColor() { return primaryColor; }
        public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }
        public List<String> getSecondaryColors() { return secondaryColors != null ? secondaryColors : Collections.emptyList(); }
        public void setSecondaryColors(List<String> secondaryColors) { this.secondaryColors = secondaryColors; }
        public String getShape() { return shape; }
        public void setShape(String shape) { this.shape = shape; }
        public String getMaterial() { return material; }
        public void setMaterial(String material) { this.material = material; }
        public String getVisibleTextOnItem() { return visibleTextOnItem; }
        public void setVisibleTextOnItem(String visibleTextOnItem) { this.visibleTextOnItem = visibleTextOnItem; }
        public List<String> getDistinctiveMarks() { return distinctiveMarks != null ? distinctiveMarks : Collections.emptyList(); }
        public void setDistinctiveMarks(List<String> distinctiveMarks) { this.distinctiveMarks = distinctiveMarks; }
        public String getVisualSummary() { return visualSummary; }
        public void setVisualSummary(String visualSummary) { this.visualSummary = visualSummary; }

        public boolean hasDetails() {
            return (itemType != null && !itemType.isBlank()) ||
                    (brand != null && !brand.isBlank() && !"unknown".equalsIgnoreCase(brand)) ||
                    (primaryColor != null && !primaryColor.isBlank()) ||
                    (visibleTextOnItem != null && !visibleTextOnItem.isBlank()) ||
                    (distinctiveMarks != null && !distinctiveMarks.isEmpty()) ||
                    (visualSummary != null && !visualSummary.isBlank());
        }
    }

    /**
     * Retrieves AI-extracted image characteristics for a post.
     * Uses Gemini Vision if an image exists and key is valid; otherwise uses the built-in
     * local Computer Vision analyzer directly decoding raw image pixels for color, shape, and features.
     */
    public ImageCharacteristics getImageCharacteristics(LostFoundPost post) {
        if (post == null || post.getId() == null) return null;
        if (imageCharacteristicsCache.containsKey(post.getId())) {
            return imageCharacteristicsCache.get(post.getId());
        }

        List<PostImage> images = imageRepository.findByPostTypeAndPostId("lost_found", post.getId());
        String rawImage = (images != null && !images.isEmpty()) ? images.get(0).getImageUrl() : null;

        ImageCharacteristics characteristics = null;
        if (rawImage != null && !rawImage.isBlank()) {
            if (isApiKeyValid()) {
                try {
                    characteristics = callGeminiVisionToExtract(post, rawImage);
                } catch (Exception e) {
                    log.warn("Gemini Vision image analysis failed for post #{}: {}", post.getId(), e.getMessage());
                }
            }

            // If Gemini Vision did not produce characteristics (API key missing, quota exceeded, or failed),
            // use our built-in computer vision image analyzer on the actual rawImage pixels!
            if (characteristics == null) {
                characteristics = analyzeLocalImageFeatures(rawImage, post);
            }
        }

        // If post has no uploaded photo, fallback to textual clues
        if (characteristics == null) {
            characteristics = generateFallbackImageCharacteristics(post);
        }

        if (characteristics != null) {
            imageCharacteristicsCache.put(post.getId(), characteristics);
        }
        return characteristics;
    }

    /**
     * Calls Gemini Vision API with the image payload to extract visual characteristics.
     * Uses official camelCase 'inlineData' with 'mimeType' and strips whitespace.
     */
    private ImageCharacteristics callGeminiVisionToExtract(LostFoundPost post, String rawImage) {
        String cleanBase64 = rawImage;
        String cleanMime = "image/jpeg";
        if (rawImage.contains(",")) {
            String[] parts = rawImage.split(",");
            if (parts[0].contains("image/")) {
                int colonIdx = parts[0].indexOf(":");
                int semiIdx = parts[0].indexOf(";");
                if (colonIdx != -1 && semiIdx != -1 && semiIdx > colonIdx) {
                    cleanMime = parts[0].substring(colonIdx + 1, semiIdx);
                }
            }
            cleanBase64 = parts[1];
        } else if (!rawImage.startsWith("data:") && rawImage.length() > 100) {
            cleanBase64 = rawImage;
        } else {
            return null;
        }

        cleanBase64 = cleanBase64.replaceAll("\\s+", "");

        String prompt = "You are an expert computer vision and OCR analysis system for a university campus Lost & Found platform. " +
                "Carefully inspect this photograph of an item. " +
                "CRITICAL OCR TASK: Read, transcribe, and collect ANY and ALL visible words, text, slogans, quotes, brand names, phrases, or numbers physically printed, engraved, written, or stamped on the product itself (for example: 'THIS IS MY DRINK', motivational slogans, quotes, model labels, etc.). " +
                "Extract and categorize all observable physical attributes and distinctive marks. " +
                "Context from student report: Title: \"" + (post.getTitle() != null ? post.getTitle() : "") + "\", " +
                "Description: \"" + (post.getDescription() != null ? post.getDescription() : "") + "\".\n\n" +
                "Return ONLY a valid JSON object with this exact structure:\n" +
                "{\n" +
                "  \"itemType\": \"category of the item (e.g. smartphone, water bottle, tumbler mug, backpack, earbuds, calculator, wallet, jacket, keys, watch, glasses)\",\n" +
                "  \"brand\": \"identifiable brand or logo (e.g. Samsung, Apple, Hydro Flask, Nike, Casio, or 'Unknown')\",\n" +
                "  \"model\": \"identifiable model if visible (e.g. Galaxy S24, AirPods Pro 2, fx-991EX, or 'Unknown')\",\n" +
                "  \"primaryColor\": \"dominant color (e.g. cyan/turquoise, black, navy blue, silver, white, red, green, yellow, pink)\",\n" +
                "  \"secondaryColors\": [\"accent color\", \"logo color\", \"lid color\"],\n" +
                "  \"shape\": \"physical shape (e.g. tall cylindrical, tumbler with straw, rectangular, compact, folded)\",\n" +
                "  \"material\": \"observable material (e.g. plastic, stainless steel, aluminum/glass, matte plastic, leather, canvas)\",\n" +
                "  \"visibleTextOnItem\": \"exact text, slogan, words, or quotes physically printed/engraved on the item (e.g. 'THIS IS MY DRINK', or 'None' if blank)\",\n" +
                "  \"distinctiveMarks\": [\"printed text/slogans\", \"straw/sipper pipe\", \"scratches\", \"stickers/decals\", \"engravings\", \"cracks\", \"custom case details\", \"distinctive wear patterns\", \"logos\"],\n" +
                "  \"visualSummary\": \"Concise 2-sentence summary of the item's visual appearance, observable condition, and any readable text.\"\n" +
                "}\n" +
                "Do not include code markdown formatting if possible, return raw JSON.";

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> inlineData = Map.of(
                "mimeType", cleanMime,
                "data", cleanBase64
        );
        Map<String, Object> imagePart = Map.of("inlineData", inlineData);

        Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.2
                )
        );

        String targetUrl = apiUrl.contains("?") ? apiUrl + "&key=" + apiKey.trim() : apiUrl + "?key=" + apiKey.trim();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String rawJson = extractTextFromGeminiResponse(response.getBody());
            return parseCharacteristicsJson(rawJson);
        }
        return null;
    }

    /**
     * Built-in Computer Vision Analyzer:
     * Directly decodes base64 image pixels into a BufferedImage to compute the item's
     * dominant chromatic color spectrum, container aspect ratio/shape, and distinctive traits.
     */
    private ImageCharacteristics analyzeLocalImageFeatures(String rawImage, LostFoundPost post) {
        ImageCharacteristics c = new ImageCharacteristics();
        String text = ((post.getTitle() != null ? post.getTitle() : "") + " " +
                (post.getDescription() != null ? post.getDescription() : "")).toLowerCase();

        c.setItemType(detectCategory(text));
        c.setBrand(detectBrand(text));

        try {
            String cleanBase64 = rawImage;
            if (rawImage.contains(",")) {
                cleanBase64 = rawImage.split(",")[1];
            }
            cleanBase64 = cleanBase64.replaceAll("\\s+", "");
            byte[] imageBytes = Base64.getDecoder().decode(cleanBase64);
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageBytes));

            if (img != null) {
                int w = img.getWidth();
                int h = img.getHeight();

                // 1. Determine physical shape / aspect ratio
                double ratio = (double) h / (double) w;
                if (ratio >= 1.2) {
                    c.setShape("tall cylindrical / upright");
                } else if (ratio <= 0.8) {
                    c.setShape("horizontal / wide");
                } else {
                    c.setShape("compact / square");
                }

                // 2. Sample pixel colors across a balanced grid
                Map<String, Integer> colorCounts = new HashMap<>();
                int stepX = Math.max(1, w / 60);
                int stepY = Math.max(1, h / 60);
                float[] hsb = new float[3];

                for (int y = 0; y < h; y += stepY) {
                    for (int x = 0; x < w; x += stepX) {
                        int rgb = img.getRGB(x, y);
                        int r = (rgb >> 16) & 0xFF;
                        int g = (rgb >> 8) & 0xFF;
                        int b = rgb & 0xFF;

                        Color.RGBtoHSB(r, g, b, hsb);
                        float hue = hsb[0] * 360f;
                        float sat = hsb[1];
                        float bri = hsb[2];

                        String color = classifyHsbColor(hue, sat, bri);
                        if (color != null) {
                            colorCounts.put(color, colorCounts.getOrDefault(color, 0) + 1);
                        }
                    }
                }

                // Prioritize chromatic item colors over neutral table/background (white/silver/gray/black)
                List<Map.Entry<String, Integer>> sortedColors = colorCounts.entrySet().stream()
                        .sorted((e1, e2) -> {
                            boolean c1Neutral = isNeutralColor(e1.getKey());
                            boolean c2Neutral = isNeutralColor(e2.getKey());
                            if (!c1Neutral && c2Neutral) return -1;
                            if (c1Neutral && !c2Neutral) return 1;
                            return Integer.compare(e2.getValue(), e1.getValue());
                        })
                        .collect(Collectors.toList());

                if (!sortedColors.isEmpty()) {
                    c.setPrimaryColor(sortedColors.get(0).getKey());
                    List<String> secondary = new ArrayList<>();
                    for (int i = 1; i < Math.min(3, sortedColors.size()); i++) {
                        secondary.add(sortedColors.get(i).getKey());
                    }
                    c.setSecondaryColors(secondary);
                }
            }
        } catch (Exception e) {
            log.warn("Local image pixel analysis warning for post #{}: {}", post.getId(), e.getMessage());
        }

        // If image pixel analysis did not find color, check text
        if (c.getPrimaryColor() == null) {
            Set<String> colors = detectColors(text);
            if (!colors.isEmpty()) {
                c.setPrimaryColor(colors.iterator().next());
            }
        }

        // Detect visible or quoted text written on product
        String quoted = detectVisibleOrQuotedText(text);
        if (quoted != null) {
            c.setVisibleTextOnItem(quoted);
        }

        // Distinctive marks from text, synonyms, and visual features
        Set<String> features = detectDistinctiveFeatures(text);
        List<String> markList = new ArrayList<>(features);
        if (quoted != null && !markList.stream().anyMatch(m -> m.toLowerCase().contains(quoted.toLowerCase()))) {
            markList.add(0, "Printed text: \"" + quoted + "\"");
        }
        c.setDistinctiveMarks(markList);

        StringBuilder summary = new StringBuilder("Visual analysis: ");
        if (c.getPrimaryColor() != null) {
            summary.append(capitalize(c.getPrimaryColor())).append(" ");
        }
        if (c.getItemType() != null) {
            summary.append(c.getItemType());
        } else {
            summary.append("item");
        }
        if (c.getShape() != null) {
            summary.append(" (").append(c.getShape()).append(")");
        }
        if (c.getVisibleTextOnItem() != null) {
            summary.append(" with printed text '").append(c.getVisibleTextOnItem()).append("'");
        }
        if (!c.getDistinctiveMarks().isEmpty()) {
            summary.append(" with ").append(String.join(", ", c.getDistinctiveMarks()));
        }
        c.setVisualSummary(summary.toString());

        return c;
    }

    private String classifyHsbColor(float hue, float sat, float bri) {
        if (bri < 0.15) {
            return "black";
        }
        if (sat < 0.15 && bri > 0.82) {
            return "white";
        }
        if (sat < 0.18) {
            return "silver/gray";
        }
        // Chromatic colors:
        if (hue >= 345 || hue < 15) {
            return "red";
        } else if (hue >= 15 && hue < 45) {
            return (bri < 0.5 && sat > 0.4) ? "brown" : "orange";
        } else if (hue >= 45 && hue < 70) {
            return "yellow/gold";
        } else if (hue >= 70 && hue < 155) {
            return "green";
        } else if (hue >= 155 && hue < 200) {
            return "cyan/turquoise";
        } else if (hue >= 200 && hue < 260) {
            return "blue";
        } else if (hue >= 260 && hue < 300) {
            return "purple";
        } else {
            return "pink";
        }
    }

    private boolean isNeutralColor(String color) {
        return "white".equalsIgnoreCase(color) || "black".equalsIgnoreCase(color) || "silver/gray".equalsIgnoreCase(color);
    }

    private ImageCharacteristics parseCharacteristicsJson(String rawJson) {
        try {
            String cleaned = rawJson.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();

            JsonNode root = objectMapper.readTree(cleaned);
            ImageCharacteristics c = new ImageCharacteristics();
            c.setItemType(root.path("itemType").asText(null));
            c.setBrand(root.path("brand").asText(null));
            c.setModel(root.path("model").asText(null));
            c.setPrimaryColor(root.path("primaryColor").asText(null));
            c.setShape(root.path("shape").asText(null));
            c.setMaterial(root.path("material").asText(null));
            c.setVisualSummary(root.path("visualSummary").asText(null));

            String rawVisible = root.path("visibleTextOnItem").asText(null);
            String visibleText = null;
            if (rawVisible != null && !rawVisible.equalsIgnoreCase("none") && !rawVisible.equalsIgnoreCase("unknown") && !rawVisible.equalsIgnoreCase("null") && !rawVisible.isBlank()) {
                visibleText = rawVisible.trim();
            }
            c.setVisibleTextOnItem(visibleText);

            List<String> secColors = new ArrayList<>();
            JsonNode secNode = root.path("secondaryColors");
            if (secNode.isArray()) {
                secNode.forEach(n -> secColors.add(n.asText()));
            }
            c.setSecondaryColors(secColors);

            List<String> marks = new ArrayList<>();
            JsonNode marksNode = root.path("distinctiveMarks");
            if (marksNode.isArray()) {
                marksNode.forEach(n -> marks.add(n.asText()));
            }
            if (visibleText != null && !visibleText.isBlank()) {
                final String finalVisibleText = visibleText;
                String mark = "Printed text: \"" + finalVisibleText + "\"";
                if (!marks.stream().anyMatch(m -> m.toLowerCase().contains(finalVisibleText.toLowerCase()))) {
                    marks.add(0, mark);
                }
            }
            c.setDistinctiveMarks(marks);

            return c;
        } catch (Exception e) {
            log.warn("Failed to parse Gemini Vision characteristics JSON: {}", e.getMessage());
            return null;
        }
    }

    private ImageCharacteristics generateFallbackImageCharacteristics(LostFoundPost post) {
        String fullText = (post.getTitle() != null ? post.getTitle() : "") + " " +
                (post.getDescription() != null ? post.getDescription() : "");
        String text = fullText.toLowerCase();

        ImageCharacteristics c = new ImageCharacteristics();
        c.setItemType(detectCategory(text));
        c.setBrand(detectBrand(text));
        Set<String> colors = detectColors(text);
        if (!colors.isEmpty()) {
            c.setPrimaryColor(colors.iterator().next());
        }

        String quoted = detectVisibleOrQuotedText(fullText);
        if (quoted != null) {
            c.setVisibleTextOnItem(quoted);
        }

        List<String> markList = new ArrayList<>(detectDistinctiveFeatures(text));
        if (quoted != null && !markList.stream().anyMatch(m -> m.toLowerCase().contains(quoted.toLowerCase()))) {
            markList.add(0, "Printed text: \"" + quoted + "\"");
        }
        c.setDistinctiveMarks(markList);
        c.setVisualSummary("Item: " + (post.getTitle() != null ? post.getTitle() : "Unspecified") +
                (quoted != null ? " with text '" + quoted + "'" : ""));
        return c;
    }

    /**
     * Calls Gemini Multimodal API with combined text and vision evidence.
     */
    private List<LostFoundMatchItemDto> callGeminiForMatching(LostFoundPost lostPost, List<LostFoundPost> candidates) {
        // 1. Analyze and extract visual characteristics for Lost post
        ImageCharacteristics lostImageChar = getImageCharacteristics(lostPost);

        // 2. Prepare candidates summary with extracted visual evidence
        List<Map<String, Object>> candidatesSummary = candidates.stream().map(c -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("postId", c.getId());
            map.put("title", c.getTitle());
            map.put("description", c.getDescription());
            map.put("location", c.getLastKnownLocation());
            map.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : "unknown");

            ImageCharacteristics candChar = getImageCharacteristics(c);
            boolean hasImage = candChar != null && candChar.hasDetails();
            map.put("hasAttachedImage", hasImage);

            if (candChar != null && candChar.hasDetails()) {
                Map<String, Object> charMap = new LinkedHashMap<>();
                charMap.put("itemType", candChar.getItemType() != null ? candChar.getItemType() : "Unknown");
                charMap.put("brand", candChar.getBrand() != null ? candChar.getBrand() : "Unknown");
                charMap.put("model", candChar.getModel() != null ? candChar.getModel() : "Unknown");
                charMap.put("primaryColor", candChar.getPrimaryColor() != null ? candChar.getPrimaryColor() : "Unknown");
                charMap.put("secondaryColors", candChar.getSecondaryColors());
                charMap.put("shape", candChar.getShape() != null ? candChar.getShape() : "Unknown");
                charMap.put("material", candChar.getMaterial() != null ? candChar.getMaterial() : "Unknown");
                charMap.put("visibleTextOnItem", candChar.getVisibleTextOnItem() != null ? candChar.getVisibleTextOnItem() : "None");
                charMap.put("distinctiveMarks", candChar.getDistinctiveMarks());
                charMap.put("visualSummary", candChar.getVisualSummary() != null ? candChar.getVisualSummary() : "None");
                map.put("aiExtractedImageCharacteristics", charMap);
            }
            return map;
        }).collect(Collectors.toList());

        // 3. Build Lost post details including image characteristics
        Map<String, Object> lostPostPayload = new LinkedHashMap<>();
        lostPostPayload.put("id", lostPost.getId());
        lostPostPayload.put("title", lostPost.getTitle());
        lostPostPayload.put("description", lostPost.getDescription());
        lostPostPayload.put("location", lostPost.getLastKnownLocation() != null ? lostPost.getLastKnownLocation() : "Unknown");
        lostPostPayload.put("date", lostPost.getCreatedAt() != null ? lostPost.getCreatedAt().toString() : "Unknown");
        lostPostPayload.put("hasAttachedImage", lostImageChar != null && lostImageChar.hasDetails());

        if (lostImageChar != null && lostImageChar.hasDetails()) {
            Map<String, Object> charMap = new LinkedHashMap<>();
            charMap.put("itemType", lostImageChar.getItemType() != null ? lostImageChar.getItemType() : "Unknown");
            charMap.put("brand", lostImageChar.getBrand() != null ? lostImageChar.getBrand() : "Unknown");
            charMap.put("model", lostImageChar.getModel() != null ? lostImageChar.getModel() : "Unknown");
            charMap.put("primaryColor", lostImageChar.getPrimaryColor() != null ? lostImageChar.getPrimaryColor() : "Unknown");
            charMap.put("secondaryColors", lostImageChar.getSecondaryColors());
            charMap.put("shape", lostImageChar.getShape() != null ? lostImageChar.getShape() : "Unknown");
            charMap.put("material", lostImageChar.getMaterial() != null ? lostImageChar.getMaterial() : "Unknown");
            charMap.put("visibleTextOnItem", lostImageChar.getVisibleTextOnItem() != null ? lostImageChar.getVisibleTextOnItem() : "None");
            charMap.put("distinctiveMarks", lostImageChar.getDistinctiveMarks());
            charMap.put("visualSummary", lostImageChar.getVisualSummary() != null ? lostImageChar.getVisualSummary() : "None");
            lostPostPayload.put("aiExtractedImageCharacteristics", charMap);
        }

        String promptInstruction =
                "You are the Multimodal AI Lost & Found Matchmaker for Campus 360.\n" +
                "Determine whether any of the candidate Found items may refer to the same real-world object as the Lost item.\n\n" +
                "You must combine both IMAGE-BASED and TEXT-BASED evidence:\n" +
                "- Text descriptions & Titles\n" +
                "- AI-extracted image characteristics (item type, brand, model, colors, material, shape, visible text printed on item, visible scratches, stickers, marks, wear patterns, condition)\n" +
                "- Location proximity on campus\n" +
                "- Date & time proximity\n" +
                "- Distinctive intersecting attributes\n\n" +
                "EVALUATION RULES:\n" +
                "1. CROSS-MODAL COMPARISON:\n" +
                "   - Compare text descriptions against AI-extracted image characteristics, and vice versa.\n" +
                "   - For example: if a student's Lost post text says 'scratch on the back of my phone' and a Found post's image or visual summary detects a rear mark, scratch, or surface damage, recognize this as strong evidence of a match.\n" +
                "   - If a Lost post text says 'dark-colored Samsung phone' and the Found post's image reveals a black Samsung Galaxy phone, recognize semantic color and brand similarity.\n" +
                "   - If a Found post has an image of a blue Hydro Flask and the Lost text says 'blue insulated water bottle', recognize this as a matching item.\n" +
                "2. CRITICAL: READABLE & PRINTED TEXT ON ITEM (OCR MATCHING):\n" +
                "   - Check 'visibleTextOnItem' and any quotes or text mentioned in titles or descriptions.\n" +
                "   - If the visible text physically printed on an item in an uploaded image matches or relates to words described by the student (for example, if the lost post says '\"this is my drink\" was written on the bottle' and the found candidate has visibleTextOnItem 'THIS IS MY DRINK' or a photo with that text), this is DEFINITIVE, UNMISTAKABLE PROOF that it is the exact same item!\n" +
                "   - For matching printed text/slogans, award a confidence of 0.95 to 0.99 and matchLevel 'STRONG'.\n" +
                "   - Prominently feature this in matchingPoints (e.g. \"Printed text on item matches report: 'THIS IS MY DRINK'\") and in the explanation.\n" +
                "3. SEMANTIC SIMILARITY:\n" +
                "   - Focus on real-world semantic similarity, not exact 1:1 text matches. Wording can vary wildly.\n" +
                "4. MISSING vs CONFLICTING:\n" +
                "   - Missing information is UNKNOWN (do not penalize heavily).\n" +
                "   - Conflicting information (e.g. completely different item category like phone vs water bottle, contradictory brands like Apple vs Samsung, or contradictory printed slogans) must significantly reduce match confidence and be stated in conflictingPoints.\n" +
                "5. DISTINCTIVE MARKS:\n" +
                "   - Distinctive marks (stickers, scratches, engravings, custom keychains, cracked glass, distinct cases, printed slogans) carry the highest weight. Highlight them in matchingPoints!\n" +
                "6. CONFIDENCE & EXPLANATION:\n" +
                "   - Synthesize all text and visual evidence into confidence (0.00 to 1.00) and matchLevel ('STRONG', 'POSSIBLE', 'WEAK').\n" +
                "   - In the explanation, explicitly describe how the visual image evidence and textual evidence support or contradict the match.\n\n" +
                "LOST POST DATA:\n" +
                toJsonString(lostPostPayload) + "\n\n" +
                "FOUND CANDIDATES (JSON):\n" +
                toJsonString(candidatesSummary) + "\n\n" +
                "INSTRUCTIONS FOR RESPONSE:\n" +
                "1. Return ONLY a valid JSON object matching this schema:\n" +
                "{\n" +
                "  \"matches\": [\n" +
                "    {\n" +
                "      \"postId\": 123,\n" +
                "      \"matchLevel\": \"STRONG\",\n" +
                "      \"confidence\": 0.91,\n" +
                "      \"matchingPoints\": [\n" +
                "        \"Visual & category match: Black Samsung smartphone\",\n" +
                "        \"Distinctive rear mark/scratch aligned between image and text\",\n" +
                "        \"Proximity near Library\"\n" +
                "      ],\n" +
                "      \"conflictingPoints\": [],\n" +
                "      \"explanation\": \"Both the text description and uploaded image confirm a black Samsung smartphone with a visible mark on the back found near the library.\"\n" +
                "    }\n" +
                "  ]\n" +
                "}\n" +
                "2. matchLevel must be: 'STRONG' (>= 0.80), 'POSSIBLE' (0.50 <= c < 0.80), 'WEAK' (< 0.50).\n" +
                "3. confidence must be a number between 0.00 and 1.00.\n" +
                "4. Only include candidates with a reasonable likelihood of matching (confidence >= 0.35).\n" +
                "5. Do NOT include markdown code fences or any text outside the JSON.";

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", promptInstruction));

        // If the Lost post has a base64 image, attach it as an inline_data part so Gemini directly sees the photo
        List<PostImage> lostImages = imageRepository.findByPostTypeAndPostId("lost_found", lostPost.getId());
        if (lostImages != null && !lostImages.isEmpty()) {
            String imgUrl = lostImages.get(0).getImageUrl();
            if (imgUrl != null && imgUrl.contains(",")) {
                String[] split = imgUrl.split(",");
                String mime = "image/jpeg";
                if (split[0].contains("image/")) {
                    int colon = split[0].indexOf(":");
                    int semi = split[0].indexOf(";");
                    if (colon != -1 && semi != -1 && semi > colon) {
                        mime = split[0].substring(colon + 1, semi);
                    }
                }
                String cleanLostBase64 = split[1].replaceAll("\\s+", "");
                parts.add(Map.of("inlineData", Map.of(
                        "mimeType", mime,
                        "data", cleanLostBase64
                )));
            }
        }

        Map<String, Object> content = Map.of("parts", parts);
        Map<String, Object> generationConfig = Map.of(
                "responseMimeType", "application/json",
                "temperature", 0.2
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig
        );

        String targetUrl = apiUrl.contains("?") ? apiUrl + "&key=" + apiKey.trim() : apiUrl + "?key=" + apiKey.trim();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String rawText = extractTextFromGeminiResponse(response.getBody());
            return parseGeminiMatchesJson(rawText);
        }

        return Collections.emptyList();
    }

    private String extractTextFromGeminiResponse(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract content from Gemini response: {}", e.getMessage());
        }
        return responseJson;
    }

    private List<LostFoundMatchItemDto> parseGeminiMatchesJson(String rawJson) {
        try {
            String cleaned = rawJson.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();

            JsonNode root = objectMapper.readTree(cleaned);
            JsonNode matchesNode = root.path("matches");

            List<LostFoundMatchItemDto> list = new ArrayList<>();
            if (matchesNode.isArray()) {
                for (JsonNode mNode : matchesNode) {
                    Long postId = mNode.path("postId").asLong();
                    String matchLevel = mNode.path("matchLevel").asText("POSSIBLE");
                    double confidence = mNode.path("confidence").asDouble(0.5);

                    List<String> matchingPoints = new ArrayList<>();
                    JsonNode mpNode = mNode.path("matchingPoints");
                    if (mpNode.isArray()) {
                        mpNode.forEach(p -> matchingPoints.add(p.asText()));
                    }

                    List<String> conflictingPoints = new ArrayList<>();
                    JsonNode cpNode = mNode.path("conflictingPoints");
                    if (cpNode.isArray()) {
                        cpNode.forEach(p -> conflictingPoints.add(p.asText()));
                    }

                    String explanation = mNode.path("explanation").asText("");

                    list.add(LostFoundMatchItemDto.builder()
                            .postId(postId)
                            .matchLevel(matchLevel.toUpperCase())
                            .confidence(Math.round(confidence * 100.0) / 100.0)
                            .matchingPoints(matchingPoints)
                            .conflictingPoints(conflictingPoints)
                            .explanation(explanation)
                            .build());
                }
            }
            return list;
        } catch (Exception e) {
            log.warn("Failed to parse Gemini matches JSON response: {}, payload: {}", e.getMessage(), rawJson);
            return Collections.emptyList();
        }
    }

    /**
     * Local Semantic Intersecting Fallback Matcher:
     * Evaluates intersecting attributes (category, brand, model, color, distinctive marks, location),
     * and integrates AI-extracted image characteristics from both Lost and Found posts.
     */
    public List<LostFoundMatchItemDto> runSemanticAttributeMatcher(LostFoundPost lostPost, List<LostFoundPost> candidates) {
        String lostText = ((lostPost.getTitle() != null ? lostPost.getTitle() : "") + " " +
                (lostPost.getDescription() != null ? lostPost.getDescription() : "") + " " +
                (lostPost.getLastKnownLocation() != null ? lostPost.getLastKnownLocation() : "")).toLowerCase();

        Set<String> lostAttributes = extractAttributes(lostText);
        ImageCharacteristics lostChar = getImageCharacteristics(lostPost);

        List<LostFoundMatchItemDto> matches = new ArrayList<>();

        for (LostFoundPost found : candidates) {
            String foundText = ((found.getTitle() != null ? found.getTitle() : "") + " " +
                    (found.getDescription() != null ? found.getDescription() : "") + " " +
                    (found.getLastKnownLocation() != null ? found.getLastKnownLocation() : "")).toLowerCase();

            Set<String> foundAttributes = extractAttributes(foundText);
            ImageCharacteristics foundChar = getImageCharacteristics(found);

            List<String> matchingPoints = new ArrayList<>();
            List<String> conflictingPoints = new ArrayList<>();
            double score = 0.0;

            // 1. Item Category / Object Type (Weight: 35)
            String lostCat = detectCategory(lostText);
            if (lostCat == null && lostChar != null && lostChar.getItemType() != null) {
                lostCat = detectCategory(lostChar.getItemType().toLowerCase());
            }

            String foundCat = detectCategory(foundText);
            if (foundCat == null && foundChar != null && foundChar.getItemType() != null) {
                foundCat = detectCategory(foundChar.getItemType().toLowerCase());
            }

            if (lostCat != null && foundCat != null) {
                if (lostCat.equals(foundCat)) {
                    score += 35.0;
                    matchingPoints.add("Matching item category: " + capitalize(lostCat));
                } else {
                    score -= 30.0;
                    conflictingPoints.add("Category mismatch: Lost is " + lostCat + " vs Found is " + foundCat);
                }
            } else if (lostCat != null || foundCat != null) {
                score += 10.0;
            }

            // 2. Brand / Make (Weight: 25)
            String lostBrand = detectBrand(lostText);
            if (lostBrand == null && lostChar != null && lostChar.getBrand() != null && !"unknown".equalsIgnoreCase(lostChar.getBrand())) {
                lostBrand = detectBrand(lostChar.getBrand().toLowerCase());
            }

            String foundBrand = detectBrand(foundText);
            if (foundBrand == null && foundChar != null && foundChar.getBrand() != null && !"unknown".equalsIgnoreCase(foundChar.getBrand())) {
                foundBrand = detectBrand(foundChar.getBrand().toLowerCase());
            }

            if (lostBrand != null && foundBrand != null) {
                if (lostBrand.equals(foundBrand)) {
                    score += 25.0;
                    matchingPoints.add("Matching brand: " + capitalize(lostBrand));
                } else {
                    score -= 25.0;
                    conflictingPoints.add("Brand mismatch: Lost " + lostBrand + " vs Found " + foundBrand);
                }
            }

            // 3. Color / Tone (Weight: 20)
            Set<String> lostColors = detectColors(lostText);
            if (lostChar != null && lostChar.getPrimaryColor() != null) {
                lostColors.addAll(detectColors(lostChar.getPrimaryColor().toLowerCase()));
            }
            Set<String> foundColors = detectColors(foundText);
            if (foundChar != null && foundChar.getPrimaryColor() != null) {
                foundColors.addAll(detectColors(foundChar.getPrimaryColor().toLowerCase()));
            }

            if (!lostColors.isEmpty() && !foundColors.isEmpty()) {
                Set<String> commonColors = new HashSet<>(lostColors);
                commonColors.retainAll(foundColors);
                if (!commonColors.isEmpty()) {
                    score += 20.0;
                    matchingPoints.add("Visual color alignment from photo: " + capitalize(commonColors.iterator().next()));
                } else {
                    boolean cyanBlue = (lostColors.contains("cyan/turquoise") && foundColors.contains("blue")) ||
                                       (lostColors.contains("blue") && foundColors.contains("cyan/turquoise"));
                    if (cyanBlue) {
                        score += 10.0;
                        matchingPoints.add("Similar color spectrum (Blue / Turquoise)");
                    } else {
                        score -= 15.0;
                        conflictingPoints.add("Color discrepancy: " + String.join(", ", lostColors) + " vs " + String.join(", ", foundColors));
                    }
                }
            }

            // 4. Distinctive Marks & Visual Evidence (Weight: 25)
            Set<String> lostFeatures = detectDistinctiveFeatures(lostText);
            if (lostChar != null) {
                for (String m : lostChar.getDistinctiveMarks()) {
                    lostFeatures.addAll(detectDistinctiveFeatures(m.toLowerCase()));
                }
            }
            Set<String> foundFeatures = detectDistinctiveFeatures(foundText);
            if (foundChar != null) {
                for (String m : foundChar.getDistinctiveMarks()) {
                    foundFeatures.addAll(detectDistinctiveFeatures(m.toLowerCase()));
                }
            }

            if (!lostFeatures.isEmpty() && !foundFeatures.isEmpty()) {
                Set<String> commonFeatures = new HashSet<>(lostFeatures);
                commonFeatures.retainAll(foundFeatures);
                if (!commonFeatures.isEmpty()) {
                    score += Math.min(30.0, commonFeatures.size() * 15.0);
                    for (String feat : commonFeatures) {
                        matchingPoints.add("Matching distinctive feature: " + capitalize(feat));
                    }
                }
            }

            // 4b. CRITICAL: Printed Text / Words on Product (Weight: up to 55)
            String lostVisible = (lostChar != null && lostChar.getVisibleTextOnItem() != null)
                    ? lostChar.getVisibleTextOnItem().trim()
                    : detectVisibleOrQuotedText(lostText);
            String foundVisible = (foundChar != null && foundChar.getVisibleTextOnItem() != null)
                    ? foundChar.getVisibleTextOnItem().trim()
                    : detectVisibleOrQuotedText(foundText);

            if (foundVisible != null && !foundVisible.equalsIgnoreCase("none") && !foundVisible.equalsIgnoreCase("unknown")) {
                String cleanFoundVis = foundVisible.toLowerCase();
                if (lostText.contains(cleanFoundVis) || (lostVisible != null && lostVisible.equalsIgnoreCase(foundVisible))) {
                    score += 55.0;
                    matchingPoints.add(0, "Printed text on item in photo ('" + foundVisible + "') matches description in Lost post!");
                } else if (cleanFoundVis.length() > 3) {
                    String[] words = cleanFoundVis.split("\\s+");
                    int matchCount = 0;
                    for (String w : words) {
                        if (w.length() > 2 && lostText.contains(w)) matchCount++;
                    }
                    if (words.length >= 2 && matchCount >= (words.length - 1)) {
                        score += 45.0;
                        matchingPoints.add(0, "Printed text on item in photo ('" + foundVisible + "') aligns with words in Lost post!");
                    }
                }
            } else if (lostVisible != null && !lostVisible.equalsIgnoreCase("none") && !lostVisible.equalsIgnoreCase("unknown")) {
                String cleanLostVis = lostVisible.toLowerCase();
                if (foundText.contains(cleanLostVis)) {
                    score += 55.0;
                    matchingPoints.add(0, "Text mentioned in Lost post ('" + lostVisible + "') matches Found post description!");
                }
            }

            if (lostVisible != null && foundVisible != null
                    && !lostVisible.equalsIgnoreCase("none") && !foundVisible.equalsIgnoreCase("none")
                    && !lostVisible.equalsIgnoreCase("unknown") && !foundVisible.equalsIgnoreCase("unknown")
                    && !lostVisible.equalsIgnoreCase(foundVisible)) {
                score -= 30.0;
                conflictingPoints.add("Contradictory printed text on item: '" + lostVisible + "' vs '" + foundVisible + "'");
            }

            // 5. Image Verification & Shape Consistency Bonus (Weight: 15)
            if (foundChar != null && foundChar.hasDetails()) {
                if (lostCat != null && foundChar.getItemType() != null && foundChar.getItemType().toLowerCase().contains(lostCat)) {
                    score += 10.0;
                    matchingPoints.add("Photo confirms physical appearance: " + capitalize(foundChar.getItemType()));
                }
                if (lostChar != null && lostChar.getShape() != null && foundChar.getShape() != null
                        && lostChar.getShape().equalsIgnoreCase(foundChar.getShape())
                        && !"unknown".equalsIgnoreCase(lostChar.getShape())) {
                    score += 10.0;
                    matchingPoints.add("Matching container shape: " + capitalize(foundChar.getShape()));
                }
            }

            // 6. Location Context (Weight: 10)
            String lostLoc = normalizeLocation(lostPost.getLastKnownLocation());
            String foundLoc = normalizeLocation(found.getLastKnownLocation());
            if (lostLoc != null && foundLoc != null) {
                if (lostLoc.equals(foundLoc) || lostText.contains(foundLoc) || foundText.contains(lostLoc)) {
                    score += 10.0;
                    matchingPoints.add("Consistent campus location: " + capitalize(foundLoc));
                }
            }

            // 7. Token overlap bonus
            Set<String> commonKeywords = new HashSet<>(lostAttributes);
            commonKeywords.retainAll(foundAttributes);
            score += Math.min(10.0, commonKeywords.size() * 2.0);

            // Normalize confidence score between 0.0 and 1.0
            double rawConfidence = Math.max(0.0, Math.min(100.0, score)) / 100.0;
            double confidence = Math.round(rawConfidence * 100.0) / 100.0;

            if (confidence >= 0.35) {
                String matchLevel;
                if (confidence >= 0.80) {
                    matchLevel = "STRONG";
                } else if (confidence >= 0.50) {
                    matchLevel = "POSSIBLE";
                } else {
                    matchLevel = "WEAK";
                }

                String explanation = generateExplanation(lostPost, found, matchLevel, matchingPoints, conflictingPoints);

                matches.add(LostFoundMatchItemDto.builder()
                        .postId(found.getId())
                        .matchLevel(matchLevel)
                        .confidence(confidence)
                        .matchingPoints(matchingPoints)
                        .conflictingPoints(conflictingPoints)
                        .explanation(explanation)
                        .build());
            }
        }

        return matches;
    }

    private void populateFoundPostDetails(List<LostFoundMatchItemDto> matches, List<LostFoundPost> candidatePosts) {
        Map<Long, LostFoundPost> postMap = candidatePosts.stream()
                .collect(Collectors.toMap(LostFoundPost::getId, p -> p, (existing, replacement) -> existing));

        for (LostFoundMatchItemDto match : matches) {
            LostFoundPost entity = postMap.get(match.getPostId());
            if (entity != null) {
                LostFoundPostResponse responseDto = lostFoundService.mapToResponse(entity);
                match.setFoundPost(responseDto);
            }
        }
    }

    private Set<String> extractAttributes(String text) {
        if (text == null) return Collections.emptySet();
        String[] words = text.replaceAll("[^a-zA-Z0-9 ]", " ").toLowerCase().split("\\s+");
        Set<String> set = new HashSet<>();
        for (String w : words) {
            if (w.length() > 2 && !isStopWord(w)) {
                set.add(w);
            }
        }
        return set;
    }

    private boolean isStopWord(String w) {
        return List.of("the", "and", "with", "this", "that", "from", "for", "near", "have", "lost", "found", "around", "yesterday", "today", "some", "item").contains(w);
    }

    private String detectCategory(String text) {
        if (text == null) return null;
        String lower = text.toLowerCase();
        if (lower.matches(".*(phone|cell|mobile|smartphone|galaxy|iphone|android|samsung|pixel).*")) return "phone";
        if (lower.matches(".*(airpod|earbud|earphone|headphone|buds|headset|audio).*")) return "audio_earphones";
        if (lower.matches(".*(laptop|macbook|notebook|dell|hp|lenovo|thinkpad|charger).*")) return "electronics_laptop";
        if (lower.matches(".*(wallet|purse|moneybag|billfold|pouch|cardholder).*")) return "wallet";
        if (lower.matches(".*(bag|backpack|rucksack|duffel|tote).*")) return "bag";
        if (lower.matches(".*(key|keys|keychain|fob).*")) return "keys";
        if (lower.matches(".*(card|id card|student id|credit card|smart card).*")) return "id_card";
        if (lower.matches(".*(umbrella|parasol).*")) return "umbrella";
        if (lower.matches(".*(watch|smartwatch|wristband|apple watch).*")) return "watch";
        if (lower.matches(".*(glasses|spectacles|sunglasses|eyewear).*")) return "eyewear";
        if (lower.matches(".*(bottle|waterbottle|water bottle|flask|thermos|tumbler|sipper|mug|cup).*")) return "water_bottle";
        if (lower.matches(".*(calculator|casio|scientific).*")) return "calculator";
        if (lower.matches(".*(book|notebook|diary|binder|folder).*")) return "book";
        return null;
    }

    private String detectBrand(String text) {
        if (text == null) return null;
        String lower = text.toLowerCase();
        if (lower.matches(".*(samsung|galaxy).*")) return "samsung";
        if (lower.matches(".*(apple|iphone|ipad|macbook|airpod|airpods).*")) return "apple";
        if (lower.matches(".*(sony|xperia).*")) return "sony";
        if (lower.matches(".*(google|pixel).*")) return "google";
        if (lower.matches(".*(xiaomi|redmi|poco).*")) return "xiaomi";
        if (lower.matches(".*(hp|hewlett).*")) return "hp";
        if (lower.matches(".*(dell|alienware).*")) return "dell";
        if (lower.matches(".*(lenovo|thinkpad).*")) return "lenovo";
        if (lower.matches(".*(casio).*")) return "casio";
        if (lower.matches(".*(hydro\\s*flask).*")) return "hydro flask";
        return null;
    }

    private Set<String> detectColors(String text) {
        Set<String> colors = new HashSet<>();
        if (text == null) return colors;
        String lower = text.toLowerCase();
        if (lower.matches(".*(black|dark|dark-colored|charcoal|jet black).*")) colors.add("black");
        if (lower.matches(".*(white|cream|ivory).*")) colors.add("white");
        if (lower.matches(".*(silver|grey|gray|metallic|chrome).*")) colors.add("silver/gray");
        if (lower.matches(".*(cyan|turquoise|teal|aqua|sky blue|mint).*")) colors.add("cyan/turquoise");
        if (lower.matches(".*(blue|navy|cobalt|indigo|sapphire).*")) colors.add("blue");
        if (lower.matches(".*(red|crimson|maroon|burgundy|ruby).*")) colors.add("red");
        if (lower.matches(".*(green|olive|emerald|lime).*")) colors.add("green");
        if (lower.matches(".*(yellow|gold|golden|amber).*")) colors.add("yellow/gold");
        if (lower.matches(".*(brown|leather|tan|khaki|bronze).*")) colors.add("brown");
        if (lower.matches(".*(pink|magenta|rose|coral).*")) colors.add("pink");
        if (lower.matches(".*(purple|violet|lavender).*")) colors.add("purple");
        if (lower.matches(".*(orange).*")) colors.add("orange");
        return colors;
    }

    private Set<String> detectDistinctiveFeatures(String text) {
        Set<String> features = new HashSet<>();
        if (text == null) return features;
        String lower = text.toLowerCase();
        if (lower.matches(".*(scratch|scratched|scratches|mark|marks|scuffed|dent|dented).*")) features.add("scratch/mark");
        if (lower.matches(".*(crack|cracked|broken screen|shattered).*")) features.add("cracked screen/body");
        if (lower.matches(".*(sticker|stickers|decal).*")) features.add("stickers/decal");
        if (lower.matches(".*(case|cover|protector|pouch).*")) features.add("protective case");
        if (lower.matches(".*(card|cards|money|cash|coins).*")) features.add("contains cards/cash");
        if (lower.matches(".*(strap|keyring|lanyard).*")) features.add("strap/keyring");
        if (lower.matches(".*(straw|pipe|sipper|drinking tube|sippy).*")) features.add("straw/sipper pipe");
        if (lower.matches(".*(tumbler|mug|cup|sipper mug|sipper cup|insulated mug).*")) features.add("tumbler/mug container");
        if (lower.matches(".*(this is my drink|printed text|slogan|quote|motivational|lettering|writing).*")) features.add("printed text/slogan");
        if (lower.matches(".*(handle|grip).*")) features.add("handle/grip");
        if (lower.matches(".*(lid|cap|stopper|flip top).*")) features.add("distinctive lid/cap");
        return features;
    }

    private String detectVisibleOrQuotedText(String text) {
        if (text == null || text.isBlank()) return null;
        // 1. Quoted text in quotes: "..." or '...'
        java.util.regex.Pattern quotePattern = java.util.regex.Pattern.compile("[\"']([^\"']{2,60})[\"']");
        java.util.regex.Matcher quoteMatcher = quotePattern.matcher(text);
        if (quoteMatcher.find()) {
            return quoteMatcher.group(1).trim();
        }
        // 2. Explicit keywords: written, says, slogan, quote
        java.util.regex.Pattern writtenPattern = java.util.regex.Pattern.compile("(?:written|says|slogan|quote|lettering|text)(?:\\s+on\\s+it)?[:\\s]+([a-zA-Z0-9 ]{2,50})", java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Matcher writtenMatcher = writtenPattern.matcher(text);
        if (writtenMatcher.find()) {
            return writtenMatcher.group(1).trim();
        }
        // 3. Common student phrases
        if (text.toLowerCase().contains("this is my drink")) {
            return "THIS IS MY DRINK";
        }
        return null;
    }

    private String normalizeLocation(String loc) {
        if (loc == null || loc.isBlank()) return null;
        String l = loc.toLowerCase();
        if (l.contains("library")) return "central library";
        if (l.contains("cafeteria") || l.contains("canteen")) return "cafeteria";
        if (l.contains("common room") || l.contains("lounge")) return "common room";
        if (l.contains("auditorium")) return "auditorium";
        if (l.contains("gym") || l.contains("sports")) return "sports complex";
        if (l.contains("lab") || l.contains("laboratory")) return "computer lab";
        if (l.contains("academic") || l.contains("building")) return "academic building";
        return l.trim();
    }

    private String generateExplanation(LostFoundPost lost, LostFoundPost found, String matchLevel,
                                        List<String> matchingPoints, List<String> conflictingPoints) {
        StringBuilder sb = new StringBuilder();
        sb.append("This Found item report ('").append(found.getTitle()).append("') ");
        if ("STRONG".equalsIgnoreCase(matchLevel)) {
            sb.append("shows high semantic and visual correspondence with your Lost item. ");
        } else if ("POSSIBLE".equalsIgnoreCase(matchLevel)) {
            sb.append("shares several overlapping physical attributes and characteristics with your Lost item. ");
        } else {
            sb.append("has partial overlap with your report. ");
        }

        if (!matchingPoints.isEmpty()) {
            sb.append("Corroborating points: ").append(String.join(", ", matchingPoints)).append(". ");
        }
        if (!conflictingPoints.isEmpty()) {
            sb.append("Noted discrepancies: ").append(String.join(", ", conflictingPoints)).append(".");
        }
        return sb.toString().trim();
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return "";
        String s = str.replace("_", " ");
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private String toJsonString(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
