package com.campus360.controller;

import com.campus360.dto.LostFoundPostRequest;
import com.campus360.dto.LostFoundPostResponse;
import com.campus360.dto.LostFoundStatusUpdateRequest;
import com.campus360.service.LostFoundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/lost-found")
public class LostFoundController {

    @Autowired
    private LostFoundService lostFoundService;

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
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<LostFoundPostResponse> createPost(@RequestBody LostFoundPostRequest request, Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(lostFoundService.createPost(request, studentId));
    }

    @GetMapping
    public ResponseEntity<Page<LostFoundPostResponse>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(lostFoundService.getAllPosts(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LostFoundPostResponse> getPostById(@PathVariable Long id) {
        return ResponseEntity.ok(lostFoundService.getPostById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LostFoundPostResponse> updatePost(
            @PathVariable Long id,
            @RequestBody LostFoundPostRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String adminRole = getAdminRole(authentication);
        return ResponseEntity.ok(lostFoundService.updatePost(id, request, userId, adminRole));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LostFoundPostResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody LostFoundStatusUpdateRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        return ResponseEntity.ok(lostFoundService.updateStatus(id, request, userId, accountType, adminRole));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String adminRole = getAdminRole(authentication);
        lostFoundService.deletePost(id, userId, adminRole);
        return ResponseEntity.noContent().build();
    }
}
