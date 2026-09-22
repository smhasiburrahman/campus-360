package com.campus360.controller;

import com.campus360.dto.*;
import com.campus360.service.MarketplaceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceController {

    @Autowired
    private MarketplaceService marketplaceService;

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

    // ==========================================
    // LISTINGS ENDPOINTS
    // ==========================================

    @PostMapping("/listings")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<MarketplaceListingResponse> createListing(
            @Valid @RequestBody MarketplaceListingRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(marketplaceService.createListing(request, studentId));
    }

    @GetMapping("/listings")
    public ResponseEntity<Page<MarketplaceListingResponse>> getAllListings(
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long vendorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(marketplaceService.getAllListings(minPrice, maxPrice, status, vendorId, PageRequest.of(page, size)));
    }

    @GetMapping("/listings/{id}")
    public ResponseEntity<MarketplaceListingResponse> getListingById(@PathVariable Long id) {
        return ResponseEntity.ok(marketplaceService.getListingById(id));
    }

    @PutMapping("/listings/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<MarketplaceListingResponse> updateListing(
            @PathVariable Long id,
            @Valid @RequestBody MarketplaceListingRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(marketplaceService.updateListing(id, request, studentId));
    }

    @PatchMapping("/listings/{id}/status")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<MarketplaceListingResponse> updateListingStatus(
            @PathVariable Long id,
            @RequestBody ListingStatusUpdateRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(marketplaceService.updateListingStatus(id, request, studentId));
    }

    @DeleteMapping("/listings/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteListing(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String adminRole = getAdminRole(authentication);
        marketplaceService.deleteListing(id, userId, adminRole);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // VENDOR PROFILE ENDPOINTS
    // ==========================================

    @GetMapping("/vendors/{vendorId}")
    public ResponseEntity<VendorProfileResponse> getVendorProfileById(@PathVariable Long vendorId) {
        return ResponseEntity.ok(marketplaceService.getVendorProfileById(vendorId));
    }

    @GetMapping("/vendors/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<VendorProfileResponse> getMyVendorProfile(Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(marketplaceService.getMyVendorProfile(studentId));
    }

    @PutMapping("/vendors/me")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<VendorProfileResponse> updateMyVendorProfile(
            @RequestBody VendorProfileRequest request,
            Authentication authentication) {
        Long studentId = Long.parseLong(authentication.getName());
        return ResponseEntity.ok(marketplaceService.updateMyVendorProfile(studentId, request));
    }

    // ==========================================
    // VENDOR REVIEWS ENDPOINTS
    // ==========================================

    @PostMapping("/vendors/{vendorId}/reviews")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<VendorReviewResponse> createReview(
            @PathVariable Long vendorId,
            @Valid @RequestBody VendorReviewRequest request,
            Authentication authentication) {
        Long reviewerStudentId = Long.parseLong(authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(marketplaceService.createReview(vendorId, reviewerStudentId, request));
    }

    @GetMapping("/vendors/{vendorId}/reviews")
    public ResponseEntity<Page<VendorReviewResponse>> getVendorReviews(
            @PathVariable Long vendorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(marketplaceService.getVendorReviews(vendorId, PageRequest.of(page, size)));
    }
}

