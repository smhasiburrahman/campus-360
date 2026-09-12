package com.campus360.controller;

import com.campus360.dto.OnboardingRequest;
import com.campus360.entity.Student;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @PutMapping("/me/onboarding")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> completeOnboarding(@RequestBody OnboardingRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        Student student = studentRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new RuntimeException("Student not found"));
                
        student.setUniversityId(request.getUniversityId());
        student.setFullName(request.getFullName());
        student.setDepartmentId(request.getDepartmentId());
        student.setOnboardingComplete(true);
        
        Student saved = studentRepository.save(student);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMe() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Student student = studentRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return ResponseEntity.ok(student);
    }
}
