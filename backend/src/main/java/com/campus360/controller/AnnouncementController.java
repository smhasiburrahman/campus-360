package com.campus360.controller;

import com.campus360.dto.AnnouncementRequest;
import com.campus360.dto.AnnouncementResponse;
import com.campus360.service.AnnouncementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {

    @Autowired
    private AnnouncementService announcementService;

    private String getAccountType(Authentication authentication) {
        for (GrantedAuthority auth : authentication.getAuthorities()) {
            String role = auth.getAuthority();
            if (role.startsWith("ROLE_")) {
                String roleName = role.substring(5);
                if (roleName.equals("STUDENT") || roleName.equals("CLUB") || roleName.equals("AUTHORITY") || roleName.equals("DRIVER")) {
                    return roleName;
                }
            }
        }
        return null;
    }

    private String getAdminRole(Authentication authentication) {
        for (GrantedAuthority auth : authentication.getAuthorities()) {
            if (auth.getAuthority().equals("ROLE_ADMIN")) {
                return "ADMIN";
            }
        }
        return null;
    }

    @PostMapping
    @PreAuthorize("hasRole('CLUB') or hasRole('AUTHORITY')")
    public ResponseEntity<AnnouncementResponse> createPost(@RequestBody AnnouncementRequest request, Authentication authentication) {
        Long ownerId = Long.parseLong(authentication.getName());
        String ownerType = getAccountType(authentication);
        return ResponseEntity.ok(announcementService.createPost(request, ownerId, ownerType));
    }

    @GetMapping
    public ResponseEntity<Page<AnnouncementResponse>> getAllPosts(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(announcementService.getAllPosts(category, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnnouncementResponse> getPostById(@PathVariable Long id) {
        return ResponseEntity.ok(announcementService.getPostById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AnnouncementResponse> updatePost(
            @PathVariable Long id,
            @RequestBody AnnouncementRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        return ResponseEntity.ok(announcementService.updatePost(id, request, userId, accountType, adminRole));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        announcementService.deletePost(id, userId, accountType, adminRole);
        return ResponseEntity.noContent().build();
    }
}
