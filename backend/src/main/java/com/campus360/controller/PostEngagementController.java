package com.campus360.controller;

import com.campus360.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/posts")
public class PostEngagementController {

    @Autowired
    private StudentService studentService;

    @PutMapping("/{postType}/{postId}/bookmark")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> bookmarkPost(
            @PathVariable String postType,
            @PathVariable Long postId,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        studentService.bookmarkPost(studentId, postType, postId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{postType}/{postId}/bookmark")
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

