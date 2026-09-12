package com.campus360.controller;

import com.campus360.dto.MaterialShareRequest;
import com.campus360.dto.MaterialShareResponse;
import com.campus360.service.MaterialShareService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/materials")
public class MaterialShareController {

    @Autowired
    private MaterialShareService materialShareService;

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
    public ResponseEntity<MaterialShareResponse> createMaterialShare(@RequestBody MaterialShareRequest request, Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(materialShareService.createMaterialShare(request, studentId));
    }

    @GetMapping
    public ResponseEntity<Page<MaterialShareResponse>> getAllMaterialShares(
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long trimesterId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(materialShareService.getAllMaterialShares(departmentId, courseId, trimesterId, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialShareResponse> getMaterialShareById(@PathVariable Long id) {
        return ResponseEntity.ok(materialShareService.getMaterialShareById(id));
    }

    @PostMapping("/{id}/visit")
    public ResponseEntity<Void> incrementVisits(@PathVariable Long id) {
        materialShareService.incrementVisits(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MaterialShareResponse> updateMaterialShare(
            @PathVariable Long id,
            @RequestBody MaterialShareRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        return ResponseEntity.ok(materialShareService.updateMaterialShare(id, request, userId, accountType, adminRole));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteMaterialShare(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        materialShareService.deleteMaterialShare(id, userId, accountType, adminRole);
        return ResponseEntity.noContent().build();
    }
}
