package com.campus360.controller;

import com.campus360.dto.*;
import com.campus360.service.CoursePlannerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/course-planner")
public class CoursePlannerController {

    @Autowired
    private CoursePlannerService coursePlannerService;

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) return null;
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Generate a new AI-powered course plan.
     */
    @PostMapping("/generate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> generatePlan(
            @RequestBody CoursePlanRequest request,
            Authentication authentication) {
        try {
            Long studentId = getUserId(authentication);
            CoursePlanResponse response = coursePlannerService.generatePlan(request, studentId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", e.getMessage() == null ? "null" : e.getMessage(), "stackTrace", sw.toString()));
        }
    }

    /**
     * Get the current student's plans (paginated, newest first).
     */
    @GetMapping("/my-plans")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<CoursePlanResponse>> getMyPlans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        Long studentId = getUserId(authentication);
        Page<CoursePlanResponse> plans = coursePlannerService.getMyPlans(studentId, PageRequest.of(page, size));
        return ResponseEntity.ok(plans);
    }

    /**
     * Get a specific plan by ID (must be owned by the current student).
     */
    @GetMapping("/plans/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<CoursePlanResponse> getPlanById(
            @PathVariable Long id,
            Authentication authentication) {
        Long studentId = getUserId(authentication);
        return ResponseEntity.ok(coursePlannerService.getPlanById(id, studentId));
    }

    /**
     * Delete a plan (must be owned by the current student).
     */
    @DeleteMapping("/plans/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> deletePlan(
            @PathVariable Long id,
            Authentication authentication) {
        Long studentId = getUserId(authentication);
        coursePlannerService.deletePlan(id, studentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all curriculum courses for a department (for the "completed courses" multi-select).
     */
    @GetMapping("/curriculum")
    public ResponseEntity<List<CurriculumCourseDTO>> getCurriculum(
            @RequestParam Integer departmentId) {
        return ResponseEntity.ok(coursePlannerService.getCurriculumCourses(departmentId));
    }

    /**
     * Get available specializations for a department (for the specialization dropdown).
     */
    @GetMapping("/specializations")
    public ResponseEntity<List<SpecializationDTO>> getSpecializations(
            @RequestParam Integer departmentId) {
        return ResponseEntity.ok(coursePlannerService.getSpecializations(departmentId));
    }
}
