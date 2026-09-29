package com.campus360.controller;

import com.campus360.dto.*;
import com.campus360.service.BloodHeroGeminiService;
import com.campus360.service.BloodHeroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/blood")
public class BloodHeroController {

    @Autowired
    private BloodHeroService bloodHeroService;

    @Autowired
    private BloodHeroGeminiService geminiService;

    private Long resolveStudentId(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            try {
                return Long.parseLong(authentication.getName());
            } catch (NumberFormatException ignored) {}
        }
        return 1L; // Fallback demo student ID for frictionless exploration
    }

    // 1. Live Stats
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getLiveStats() {
        return ResponseEntity.ok(bloodHeroService.getLiveStats());
    }

    // 2. Emergency Blood Requests (SOS)
    @GetMapping("/requests")
    public ResponseEntity<List<BloodEmergencyDetailDto>> getEmergencyRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String bloodGroup) {
        return ResponseEntity.ok(bloodHeroService.getAllRequests(status, bloodGroup));
    }

    @GetMapping("/requests/me")
    public ResponseEntity<List<BloodEmergencyDetailDto>> getMyRequests(
            @RequestParam(required = false) Long studentId,
            Authentication authentication) {
        Long resolvedId = resolveStudentId(authentication);
        if (studentId != null && studentId > 0) {
            resolvedId = studentId;
        }
        return ResponseEntity.ok(bloodHeroService.getMyRequests(resolvedId));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<BloodEmergencyDetailDto> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(bloodHeroService.getRequestById(id));
    }

    @GetMapping("/requests/{id}/matched-donors")
    public ResponseEntity<List<BloodDonorProfileDto>> getMatchedDonorsForRequest(@PathVariable Long id) {
        return ResponseEntity.ok(bloodHeroService.getMatchedDonorsForRequest(id));
    }

    @PostMapping("/requests")
    public ResponseEntity<BloodEmergencyDetailDto> createEmergencyRequest(
            @RequestBody BloodEmergencyPostDto request,
            Authentication authentication) {
        Long requesterId = resolveStudentId(authentication);
        if (request.getRequesterId() != null && request.getRequesterId() > 0) {
            requesterId = request.getRequesterId();
        }
        return ResponseEntity.ok(bloodHeroService.createBloodRequest(requesterId, request));
    }

    @PatchMapping("/requests/{id}/status")
    public ResponseEntity<BloodEmergencyDetailDto> updateRequestStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        Long userId = resolveStudentId(authentication);
        String newStatus = body.getOrDefault("status", "FULFILLED");
        return ResponseEntity.ok(bloodHeroService.updateRequestStatus(id, userId, newStatus));
    }

    @PostMapping("/requests/{id}/outside-resolution")
    public ResponseEntity<BloodEmergencyDetailDto> resolveManagedOutside(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        Long userId = resolveStudentId(authentication);
        String source = body.get("source") != null ? body.get("source").toString() : "OUTSIDE_DONOR";
        String notes = body.get("notes") != null ? body.get("notes").toString() : "Blood arranged externally";
        Integer unitsAdded = body.get("unitsAdded") != null ? Integer.valueOf(body.get("unitsAdded").toString()) : 0;
        Boolean markClosed = body.get("markClosed") != null ? Boolean.valueOf(body.get("markClosed").toString()) : true;
        return ResponseEntity.ok(bloodHeroService.resolveManagedOutside(id, userId, source, notes, unitsAdded, markClosed));
    }

    @PostMapping("/requests/{id}/donate")
    public ResponseEntity<BloodEmergencyDetailDto> recordDonation(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        Long donorStudentId = resolveStudentId(authentication);
        String notes = body != null ? body.getOrDefault("notes", "Donation recorded via Campus 360 BloodHero") : "Donation recorded";
        return ResponseEntity.ok(bloodHeroService.recordDonation(id, donorStudentId, notes));
    }

    // 3. Donor Directory & Profile
    @GetMapping("/donors")
    public ResponseEntity<List<BloodDonorProfileDto>> getDonors(
            @RequestParam(required = false) String bloodGroup,
            @RequestParam(required = false) Boolean availableOnly) {
        return ResponseEntity.ok(bloodHeroService.getAllDonors(bloodGroup, availableOnly));
    }

    @GetMapping("/donors/me")
    public ResponseEntity<BloodDonorProfileDto> getMyDonorProfile(Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        return ResponseEntity.ok(bloodHeroService.getDonorProfile(studentId));
    }

    @PostMapping("/donors/register")
    public ResponseEntity<BloodDonorProfileDto> registerDonor(
            @RequestBody BloodDonorRegistrationDto registrationDto,
            Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        return ResponseEntity.ok(bloodHeroService.registerOrUpdateDonor(studentId, registrationDto));
    }

    @PatchMapping("/donors/availability")
    public ResponseEntity<BloodDonorProfileDto> toggleAvailability(
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {
        Long studentId = resolveStudentId(authentication);
        Boolean isAvailable = body.getOrDefault("isAvailable", body.getOrDefault("available", true));
        return ResponseEntity.ok(bloodHeroService.toggleAvailability(studentId, isAvailable));
    }

    // 4. AI Endpoints
    @PostMapping("/ai/scan-slip")
    public ResponseEntity<BloodSlipScanDto> scanDoctorSlip(@RequestBody BloodSlipScanDto scanRequest) {
        return ResponseEntity.ok(geminiService.scanDoctorSlip(scanRequest.getImageBase64(), scanRequest.getMimeType()));
    }

    @PostMapping("/ai/generate-broadcast")
    public ResponseEntity<BloodBroadcastDto> generateBroadcasts(@RequestBody BloodBroadcastDto broadcastDto) {
        return ResponseEntity.ok(geminiService.generateBroadcasts(broadcastDto));
    }

    @PostMapping("/ai/screen-eligibility")
    public ResponseEntity<BloodEligibilityCheckDto> screenEligibility(@RequestBody BloodEligibilityCheckDto checkDto) {
        return ResponseEntity.ok(geminiService.checkEligibility(checkDto));
    }
}
