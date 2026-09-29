package com.campus360.service;

import com.campus360.dto.BloodBroadcastDto;
import com.campus360.dto.BloodEligibilityCheckDto;
import com.campus360.dto.BloodSlipScanDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class BloodHeroGeminiService {

    private static final Logger log = LoggerFactory.getLogger(BloodHeroGeminiService.class);

    @Value("${gemini.chatbot.api.key:}")
    private String apiKey;

    @Value("${gemini.chatbot.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BloodHeroGeminiService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(60000);
        this.restTemplate = new RestTemplate(factory);
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !apiKey.contains("YOUR_");
    }

    /**
     * Multimodal OCR: Scans a Doctor's Blood Requisition Slip or Hospital Memo
     * and extracts structured emergency blood requisition details.
     */
    public BloodSlipScanDto scanDoctorSlip(String base64Image, String mimeType) {
        if (!isConfigured()) {
            return fallbackSlipScan("Gemini API key is not configured.");
        }

        try {
            if (base64Image == null || base64Image.isBlank()) {
                return BloodSlipScanDto.builder()
                        .success(false)
                        .message("No image provided.")
                        .build();
            }

            // Strip data URL prefix if present (e.g. data:image/jpeg;base64,)
            String cleanBase64 = base64Image;
            String cleanMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";
            if (base64Image.contains(",")) {
                String[] parts = base64Image.split(",");
                if (parts[0].contains("image/")) {
                    cleanMime = parts[0].substring(parts[0].indexOf(":") + 1, parts[0].indexOf(";"));
                }
                cleanBase64 = parts[1];
            }

            String prompt = "You are a specialized medical OCR assistant. Analyze this doctor's blood requisition slip, prescription, or hospital memo. " +
                    "Extract the following information and output ONLY a valid JSON object with these exact keys:\n" +
                    "{\n" +
                    "  \"patientName\": \"Patient Name or 'Not specified'\",\n" +
                    "  \"bloodGroup\": \"One of: A+, A-, B+, B-, AB+, AB-, O+, O- or 'Unknown'\",\n" +
                    "  \"unitsNeeded\": 1,\n" +
                    "  \"hospitalName\": \"Hospital Name or 'Unknown Hospital'\",\n" +
                    "  \"hospitalLocation\": \"City or Hospital Area\",\n" +
                    "  \"wardBed\": \"Ward, Cabin, or Bed details\",\n" +
                    "  \"urgencyLevel\": \"CRITICAL, SAME_DAY, or WITHIN_48H\",\n" +
                    "  \"patientCondition\": \"Brief diagnosis or reason (e.g. surgery, anemia, accident)\",\n" +
                    "  \"neededDate\": \"Estimated deadline or today\"\n" +
                    "}\n" +
                    "Do not enclose in markdown code blocks if possible, or return clean JSON.";

            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> inlineData = Map.of(
                    "mime_type", cleanMime,
                    "data", cleanBase64
            );
            Map<String, Object> imagePart = Map.of("inline_data", inlineData);

            Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
            Map<String, Object> requestBody = Map.of("contents", List.of(content));

            String targetUrl = apiUrl + "?key=" + apiKey.trim();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String aiText = extractCandidateText(response.getBody());
                log.info("Gemini Slip OCR raw response: {}", aiText);

                // Parse extracted JSON
                return parseSlipJson(aiText);
            }

            return fallbackSlipScan("API returned status: " + response.getStatusCode());

        } catch (Exception e) {
            log.error("Failed to scan doctor slip via Gemini Vision: {}", e.getMessage(), e);
            return fallbackSlipScan("Scanning error: " + e.getMessage());
        }
    }

    /**
     * Generates structured 1-click broadcasts for WhatsApp, Facebook student groups, and SMS flashes.
     */
    public BloodBroadcastDto generateBroadcasts(BloodBroadcastDto req) {
        if (!isConfigured()) {
            return generateLocalBroadcasts(req);
        }

        try {
            String prompt = String.format(
                    "You are the Campus 360 Emergency Dispatcher. Generate 3 formatted emergency broadcast messages for a campus blood drive:\n" +
                    "Patient: %s\n" +
                    "Blood Group Needed: %s\n" +
                    "Units Needed: %d Bag(s)\n" +
                    "Hospital: %s (%s)\n" +
                    "Ward/Bed: %s\n" +
                    "Urgency Level: %s\n" +
                    "Required Date: %s\n" +
                    "Contact Number: %s\n" +
                    "Condition: %s\n\n" +
                    "Generate a JSON response with keys:\n" +
                    "{\n" +
                    "  \"whatsappText\": \"Formatted WhatsApp message with bold emojis, clear bullet points, hospital address, and direct call instruction.\",\n" +
                    "  \"facebookText\": \"Compelling narrative post for university batch/club Facebook groups with relevant hashtags.\",\n" +
                    "  \"smsText\": \"160-char concise emergency SMS notification with contact number.\"\n" +
                    "}",
                    req.getPatientName() != null ? req.getPatientName() : "Patient",
                    req.getBloodGroup() != null ? req.getBloodGroup() : "Unknown",
                    req.getUnitsNeeded() != null ? req.getUnitsNeeded() : 1,
                    req.getHospitalName() != null ? req.getHospitalName() : "Hospital",
                    req.getHospitalLocation() != null ? req.getHospitalLocation() : "Dhaka",
                    req.getWardBed() != null ? req.getWardBed() : "General Ward",
                    req.getUrgencyLevel() != null ? req.getUrgencyLevel() : "SAME_DAY",
                    req.getNeededDate() != null ? req.getNeededDate() : "Immediately",
                    req.getContactNumber() != null ? req.getContactNumber() : "Contact Requester",
                    req.getPatientCondition() != null ? req.getPatientCondition() : "Emergency medical procedure"
            );

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            String targetUrl = apiUrl + "?key=" + apiKey.trim();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String aiText = extractCandidateText(response.getBody());
                JsonNode root = parseJsonFlexible(aiText);
                if (root != null) {
                    req.setWhatsappText(root.path("whatsappText").asText(generateLocalWhatsApp(req)));
                    req.setFacebookText(root.path("facebookText").asText(generateLocalFacebook(req)));
                    req.setSmsText(root.path("smsText").asText(generateLocalSms(req)));
                    return req;
                }
            }
        } catch (Exception e) {
            log.warn("Gemini broadcast generation failed, using local template: {}", e.getMessage());
        }

        return generateLocalBroadcasts(req);
    }

    /**
     * "Can I Donate?" Conversational Medical Eligibility Screener based on WHO/Red Crescent guidelines.
     */
    public BloodEligibilityCheckDto checkEligibility(BloodEligibilityCheckDto req) {
        if (!isConfigured()) {
            return localEligibilityEvaluation(req);
        }

        try {
            String prompt = String.format(
                    "You are a medical blood donation safety assistant for University students. Evaluate this student's query and details against official blood donation criteria:\n" +
                    "Student Query: \"%s\"\n" +
                    "Blood Group: %s\n" +
                    "Last Donation Date: %s\n" +
                    "Weight: %s kg\n" +
                    "Gender: %s\n\n" +
                    "Rules to verify (Bangladesh Red Crescent, Sandhani, Quantum & WHO Standards):\n" +
                    "- Minimum 90 days cooldown between donations for males, 120 days for females.\n" +
                    "- Minimum body weight: 45 kg for females, 50 kg for males.\n" +
                    "- Dengue recovery: wait at least 6 months after full recovery before donating.\n" +
                    "- Typhoid/Malaria: wait 3-6 months after full recovery.\n" +
                    "- Jaundice: childhood Hepatitis A (before age 11) is acceptable after full recovery; Hepatitis B or C is permanent deferral.\n" +
                    "- 7-14 days after recovery from viral flu/fever/antibiotics.\n" +
                    "- Fasting (Roza): recommend donating after Iftar to prevent dehydration/hypotension.\n" +
                    "- Age: 18-65.\n\n" +
                    "Return ONLY a JSON object:\n" +
                    "{\n" +
                    "  \"eligible\": true/false,\n" +
                    "  \"verdict\": \"Short 1-line headline verdict (e.g. 'Eligible to Donate Today' or 'Wait 18 Days')\",\n" +
                    "  \"explanation\": \"Friendly 2-3 sentence explanation with medical rationale.\",\n" +
                    "  \"nextEligibleDate\": \"Suggested date or 'Available now'\",\n" +
                    "  \"disclaimer\": \"Final fitness is determined by medical staff on site.\"\n" +
                    "}",
                    req.getQuery() != null ? req.getQuery() : "General check",
                    req.getBloodGroup() != null ? req.getBloodGroup() : "Unknown",
                    req.getLastDonationDate() != null ? req.getLastDonationDate() : "Never",
                    req.getWeightKg() != null ? req.getWeightKg().toString() : "Not specified",
                    req.getGender() != null ? req.getGender() : "Not specified"
            );

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
            );

            String targetUrl = apiUrl + "?key=" + apiKey.trim();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String aiText = extractCandidateText(response.getBody());
                JsonNode root = parseJsonFlexible(aiText);
                if (root != null) {
                    req.setEligible(root.path("eligible").asBoolean(true));
                    req.setVerdict(root.path("verdict").asText("Evaluation Complete"));
                    req.setExplanation(root.path("explanation").asText(""));
                    req.setNextEligibleDate(root.path("nextEligibleDate").asText("Eligible Today"));
                    req.setDisclaimer("Guidance based on standard international criteria. Final physical test happens at donation facility.");
                    return req;
                }
            }
        } catch (Exception e) {
            log.warn("Gemini eligibility check failed, falling back to rule engine: {}", e.getMessage());
        }

        return localEligibilityEvaluation(req);
    }

    private BloodSlipScanDto parseSlipJson(String aiText) {
        JsonNode root = parseJsonFlexible(aiText);
        if (root != null) {
            return BloodSlipScanDto.builder()
                    .patientName(root.path("patientName").asText("Patient"))
                    .bloodGroup(sanitizeBloodGroup(root.path("bloodGroup").asText("O+")))
                    .unitsNeeded(Math.max(1, root.path("unitsNeeded").asInt(1)))
                    .hospitalName(root.path("hospitalName").asText("Hospital Name"))
                    .hospitalLocation(root.path("hospitalLocation").asText("Dhaka"))
                    .wardBed(root.path("wardBed").asText(""))
                    .urgencyLevel(root.path("urgencyLevel").asText("SAME_DAY"))
                    .neededDate(root.path("neededDate").asText("Today"))
                    .patientCondition(root.path("patientCondition").asText("Prescribed for medical procedure"))
                    .rawSummary(aiText)
                    .success(true)
                    .message("Doctor slip scanned successfully.")
                    .build();
        }
        return fallbackSlipScan("Could not parse medical JSON from image.");
    }

    private String sanitizeBloodGroup(String raw) {
        if (raw == null) return "O+";
        String clean = raw.trim().toUpperCase();
        List<String> valid = List.of("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-");
        for (String bg : valid) {
            if (clean.contains(bg)) return bg;
        }
        return "O+";
    }

    private JsonNode parseJsonFlexible(String text) {
        if (text == null) return null;
        try {
            String cleaned = text.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();
            int start = cleaned.indexOf("{");
            int end = cleaned.lastIndexOf("}");
            if (start != -1 && end != -1 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }
            return objectMapper.readTree(cleaned);
        } catch (Exception e) {
            log.warn("Could not parse JSON from text: {}", e.getMessage());
            return null;
        }
    }

    private String extractCandidateText(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText("");
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract candidate text: {}", e.getMessage());
        }
        return "";
    }

    private BloodSlipScanDto fallbackSlipScan(String reason) {
        return BloodSlipScanDto.builder()
                .patientName("")
                .bloodGroup("O+")
                .unitsNeeded(1)
                .hospitalName("")
                .hospitalLocation("Dhaka")
                .wardBed("")
                .urgencyLevel("SAME_DAY")
                .patientCondition("")
                .success(false)
                .message(reason)
                .build();
    }

    private BloodBroadcastDto generateLocalBroadcasts(BloodBroadcastDto req) {
        req.setWhatsappText(generateLocalWhatsApp(req));
        req.setFacebookText(generateLocalFacebook(req));
        req.setSmsText(generateLocalSms(req));
        return req;
    }

    private String generateLocalWhatsApp(BloodBroadcastDto req) {
        return String.format(
                "🚨 *URGENT BLOOD REQUIRED (%s)* 🚨\n\n" +
                "🩸 *Blood Group:* %s\n" +
                "📦 *Units Needed:* %d Bag(s)\n" +
                "🏥 *Hospital:* %s, %s\n" +
                "📍 *Ward / Bed:* %s\n" +
                "⏰ *Required By:* %s\n" +
                "📝 *Condition:* %s\n\n" +
                "📞 *Direct Contact:* %s\n\n" +
                "🛡️ *Verified via Campus 360 BloodHero*\n" +
                "Please forward to student & batch groups!",
                req.getUrgencyLevel() != null ? req.getUrgencyLevel() : "URGENT",
                req.getBloodGroup() != null ? req.getBloodGroup() : "Any Compatible",
                req.getUnitsNeeded() != null ? req.getUnitsNeeded() : 1,
                req.getHospitalName() != null ? req.getHospitalName() : "Hospital",
                req.getHospitalLocation() != null ? req.getHospitalLocation() : "Dhaka",
                req.getWardBed() != null ? req.getWardBed() : "General Ward",
                req.getNeededDate() != null ? req.getNeededDate() : "Today",
                req.getPatientCondition() != null ? req.getPatientCondition() : "Emergency Surgery",
                req.getContactNumber() != null ? req.getContactNumber() : "See App"
        );
    }

    private String generateLocalFacebook(BloodBroadcastDto req) {
        return String.format(
                "🔴 URGENT BLOOD NEEDED FOR CAMPUS PEER / RELATIVE 🔴\n\n" +
                "Patient %s urgently requires %d bag(s) of %s blood at %s (%s). " +
                "The patient is currently admitted at %s undergoing medical care.\n\n" +
                "If you or anyone you know has %s blood and is eligible to donate, please reach out immediately.\n\n" +
                "📞 Contact: %s\n" +
                "#Campus360 #BloodHero #BloodDonationDhaka #EmergencyBlood #SaveALife",
                req.getPatientName() != null ? req.getPatientName() : "Patient",
                req.getUnitsNeeded() != null ? req.getUnitsNeeded() : 1,
                req.getBloodGroup() != null ? req.getBloodGroup() : "Required",
                req.getHospitalName() != null ? req.getHospitalName() : "Hospital",
                req.getHospitalLocation() != null ? req.getHospitalLocation() : "Dhaka",
                req.getWardBed() != null ? req.getWardBed() : "Ward",
                req.getBloodGroup() != null ? req.getBloodGroup() : "",
                req.getContactNumber() != null ? req.getContactNumber() : "Call Now"
        );
    }

    private String generateLocalSms(BloodBroadcastDto req) {
        return String.format(
                "URGENT: %s blood needed (%d bags) at %s for %s. Call %s. Pls help! - Campus360 BloodHero",
                req.getBloodGroup() != null ? req.getBloodGroup() : "Blood",
                req.getUnitsNeeded() != null ? req.getUnitsNeeded() : 1,
                req.getHospitalName() != null ? req.getHospitalName() : "Hospital",
                req.getPatientName() != null ? req.getPatientName() : "Patient",
                req.getContactNumber() != null ? req.getContactNumber() : "Phone"
        );
    }

    private BloodEligibilityCheckDto localEligibilityEvaluation(BloodEligibilityCheckDto req) {
        String q = req.getQuery() != null ? req.getQuery().toLowerCase() : "";
        boolean eligible = true;
        String verdict = "Eligible to Donate Today";
        String explanation = "You meet the standard physical criteria for whole blood donation. Ensure you have had a wholesome meal and drink plenty of water.";

        if (q.contains("dengue")) {
            eligible = false;
            verdict = "Wait 6 months after full recovery from Dengue";
            explanation = "Dengue causes severe platelet and immune depletion. Bangladesh Red Crescent and WHO guidelines mandate waiting at least 6 months after recovery before whole blood donation.";
            req.setNextEligibleDate("6 Months Post-Recovery");
        } else if (q.contains("jaundice") || q.contains("hepatitis")) {
            eligible = false;
            verdict = "Medical screening required (HBsAg test)";
            explanation = "Childhood jaundice (Hepatitis A) that fully resolved is acceptable. However, active Hepatitis B or C is a permanent deferral. An on-site screening test at the medical center is required.";
            req.setNextEligibleDate("Upon Medical Screening");
        } else if (q.contains("fasting") || q.contains("roza")) {
            eligible = false;
            verdict = "Recommended to donate after Iftar";
            explanation = "Donating blood while fasting poses a high risk of acute hypovolemia, dizziness, and sudden fainting. It is strongly advised to donate 1-2 hours after a nutritious Iftar with ample fluids.";
            req.setNextEligibleDate("Today after Iftar");
        } else if (q.contains("fever") || q.contains("cold") || q.contains("flu")) {
            eligible = false;
            verdict = "Wait until 14 days after full recovery";
            explanation = "Donation while recovering from infection can weaken your immune system and compromise recipient safety.";
        } else if (q.contains("antibiotic")) {
            eligible = false;
            verdict = "Wait 7 days after completing antibiotic course";
            explanation = "Active antibiotics in the bloodstream can cause allergic reactions in immunocompromised recipients.";
        } else if (q.contains("47 kg") || q.contains("weight") || q.contains("45 kg")) {
            eligible = false;
            verdict = "Minimum weight of 48-50 kg required";
            explanation = "Standard whole blood bags are 350-450 mL. Donating with a body weight below 48-50 kg significantly increases the risk of donor shock or acute anemia.";
        } else if (q.contains("70 days") || q.contains("75 days") || q.contains("2 months")) {
            eligible = false;
            verdict = "Wait 90 days between donations";
            explanation = "In Bangladesh, safe red blood cell regeneration requires at least 90 days for male donors and 120 days for female donors.";
        } else if (q.contains("tattoo") || q.contains("piercing")) {
            eligible = false;
            verdict = "Wait 6 months after receiving a tattoo or piercing";
            explanation = "Guidelines mandate a 6-month window to rule out bloodborne pathogen risks.";
        }

        req.setEligible(eligible);
        req.setVerdict(verdict);
        req.setExplanation(explanation);
        req.setNextEligibleDate(eligible ? "Available Now" : "Consult Medical Staff");
        req.setDisclaimer("Criteria based on Red Crescent and WHO recommendations. Final screening occurs at the medical center.");
        return req;
    }
}
