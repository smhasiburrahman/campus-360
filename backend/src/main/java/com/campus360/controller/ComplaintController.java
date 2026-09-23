package com.campus360.controller;

import com.campus360.dto.ComplaintRequest;
import com.campus360.dto.ComplaintResponse;
import com.campus360.dto.ComplaintStatusUpdateRequest;
import com.campus360.dto.ReactionRequest;
import com.campus360.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    private String getAdminRole(Authentication authentication) {
        for (GrantedAuthority auth : authentication.getAuthorities()) {
            if (auth.getAuthority().equals("ROLE_ADMIN")) {
                return "ADMIN";
            }
        }
        return null;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ComplaintResponse> createComplaint(@RequestBody ComplaintRequest request, Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(complaintService.createComplaint(request, studentId));
    }

    @GetMapping
    public ResponseEntity<Page<ComplaintResponse>> getAllComplaints(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Long currentUserId = authentication != null ? Long.parseLong(authentication.getName()) : null;
        return ResponseEntity.ok(complaintService.getAllComplaints(status, PageRequest.of(page, size), currentUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable Long id, Authentication authentication) {
        Long currentUserId = authentication != null ? Long.parseLong(authentication.getName()) : null;
        return ResponseEntity.ok(complaintService.getComplaintById(id, currentUserId));
    }

    @PutMapping("/{id}/reaction")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> reactToComplaint(
            @PathVariable Long id,
            @RequestBody ReactionRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        complaintService.reactToComplaint(id, request.getReaction(), studentId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ComplaintResponse> updateComplaint(
            @PathVariable Long id,
            @RequestBody ComplaintRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(complaintService.updateComplaint(id, request, userId));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('AUTHORITY') or hasRole('ADMIN')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody ComplaintStatusUpdateRequest request,
            Authentication authentication) {
        Long authorityId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(complaintService.updateStatus(id, request, authorityId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteComplaint(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String adminRole = getAdminRole(authentication);
        complaintService.deleteComplaint(id, userId, adminRole);
        return ResponseEntity.noContent().build();
    }
}
