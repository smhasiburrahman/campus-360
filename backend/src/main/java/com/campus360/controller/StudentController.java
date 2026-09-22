package com.campus360.controller;

import com.campus360.dto.*;
import com.campus360.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {

    @Autowired
    private StudentService studentService;

    @PutMapping("/me/onboarding")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentProfileResponse> completeOnboarding(
            @RequestBody OnboardingRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(studentService.completeOnboarding(studentId, request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentProfileResponse> getMe(Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(studentService.getMyProfile(studentId));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentProfileResponse> updateMe(
            @RequestBody StudentProfileUpdateRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(studentService.updateMyProfile(studentId, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PublicStudentProfileResponse> getPublicProfile(@PathVariable Long id) {
        return ResponseEntity.ok(studentService.getPublicProfile(id));
    }

    @GetMapping("/me/posts")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<StudentPostItemDTO>> getMyPosts(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(studentService.getMyPosts(studentId, type, PageRequest.of(page, size)));
    }

    @GetMapping("/me/bookmarks")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<StudentPostItemDTO>> getMyBookmarks(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(studentService.getMyBookmarks(studentId, type, PageRequest.of(page, size)));
    }

    @PutMapping("/me/bookmarks/{postType}/{postId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> bookmarkPost(
            @PathVariable String postType,
            @PathVariable Long postId,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        studentService.bookmarkPost(studentId, postType, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me/bookmarks/{postType}/{postId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> unbookmarkPost(
            @PathVariable String postType,
            @PathVariable Long postId,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        studentService.unbookmarkPost(studentId, postType, postId);
        return ResponseEntity.noContent().build();
    }
}
