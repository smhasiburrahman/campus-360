package com.campus360.service;

import com.campus360.dto.*;
import com.campus360.entity.MarketplaceListing;
import com.campus360.entity.PostImage;
import com.campus360.entity.Student;
import com.campus360.entity.VendorProfile;
import com.campus360.entity.VendorReview;
import com.campus360.repository.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MarketplaceService {

    @Autowired
    private MarketplaceListingRepository listingRepository;

    @Autowired
    private VendorProfileRepository vendorProfileRepository;

    @Autowired
    private VendorReviewRepository vendorReviewRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private StudentRepository studentRepository;

    // ==========================================
    // VENDOR PROFILE OPERATIONS
    // ==========================================

    @Transactional
    public VendorProfile getOrCreateVendorProfile(Long studentId) {
        return vendorProfileRepository.findByStudentId(studentId)
                .orElseGet(() -> {
                    Student student = studentRepository.findById(studentId)
                            .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));

                    VendorProfile profile = new VendorProfile();
                    profile.setStudentId(studentId);
                    String initialName = (student.getFullName() != null && !student.getFullName().trim().isEmpty())
                            ? student.getFullName()
                            : "Student #" + studentId;
                    profile.setVendorName(initialName);
                    profile.setBio(null);
                    profile.setAvgRating(BigDecimal.ZERO);
                    profile.setRatingCount(0);
                    return vendorProfileRepository.save(profile);
                });
    }

    public VendorProfileResponse getVendorProfileById(Long vendorId) {
        VendorProfile profile = vendorProfileRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor profile not found with ID: " + vendorId));
        return mapToVendorResponse(profile);
    }

    public VendorProfileResponse getMyVendorProfile(Long studentId) {
        VendorProfile profile = getOrCreateVendorProfile(studentId);
        return mapToVendorResponse(profile);
    }

    @Transactional
    public VendorProfileResponse updateMyVendorProfile(Long studentId, VendorProfileRequest request) {
        VendorProfile profile = getOrCreateVendorProfile(studentId);
        if (request.getVendorName() != null && !request.getVendorName().trim().isEmpty()) {
            profile.setVendorName(request.getVendorName().trim());
        }
        if (request.getBio() != null) {
            profile.setBio(request.getBio().trim());
        }
        VendorProfile saved = vendorProfileRepository.save(profile);
        return mapToVendorResponse(saved);
    }

    private VendorProfileResponse mapToVendorResponse(VendorProfile profile) {
        return VendorProfileResponse.builder()
                .id(profile.getId())
                .studentId(profile.getStudentId())
                .vendorName(profile.getVendorName())
                .bio(profile.getBio())
                .avgRating(profile.getAvgRating())
                .ratingCount(profile.getRatingCount())
                .createdAt(profile.getCreatedAt())
                .build();
    }

    // ==========================================
    // VENDOR REVIEW OPERATIONS
    // ==========================================

    @Transactional
    public VendorReviewResponse createReview(Long vendorId, Long reviewerStudentId, VendorReviewRequest request) {
        VendorProfile vendor = vendorProfileRepository.findById(vendorId)
                .orElseThrow(() -> new RuntimeException("Vendor profile not found with ID: " + vendorId));

        if (vendor.getStudentId().equals(reviewerStudentId)) {
            throw new RuntimeException("You cannot review your own vendor profile");
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        VendorReview review = new VendorReview();
        review.setVendorId(vendorId);
        review.setReviewerId(reviewerStudentId);
        review.setRating(request.getRating());
        review.setReviewText(request.getReviewText());

        VendorReview savedReview = vendorReviewRepository.save(review);
        return mapToReviewResponse(savedReview);
    }

    public Page<VendorReviewResponse> getVendorReviews(Long vendorId, Pageable pageable) {
        if (!vendorProfileRepository.existsById(vendorId)) {
            throw new RuntimeException("Vendor profile not found with ID: " + vendorId);
        }

        return vendorReviewRepository.findByVendorId(vendorId, pageable)
                .map(this::mapToReviewResponse);
    }

    private VendorReviewResponse mapToReviewResponse(VendorReview review) {
        String reviewerName = "Anonymous Student";
        if (review.getReviewerId() != null) {
            reviewerName = studentRepository.findById(review.getReviewerId())
                    .map(Student::getFullName)
                    .orElse("Student #" + review.getReviewerId());
        }

        return VendorReviewResponse.builder()
                .id(review.getId())
                .vendorId(review.getVendorId())
                .reviewerId(review.getReviewerId())
                .reviewerName(reviewerName)
                .rating(review.getRating())
                .reviewText(review.getReviewText())
                .createdAt(review.getCreatedAt())
                .build();
    }

    // ==========================================
    // MARKETPLACE LISTING OPERATIONS
    // ==========================================

    @Transactional
    public MarketplaceListingResponse createListing(MarketplaceListingRequest request, Long studentId) {
        VendorProfile vendor = getOrCreateVendorProfile(studentId);

        MarketplaceListing listing = new MarketplaceListing();
        listing.setVendorId(vendor.getId());
        listing.setDescription(request.getDescription());
        listing.setPrice(request.getPrice());
        listing.setStatus("unsold");
        listing.setShowStatus(request.getShowStatus() != null ? request.getShowStatus() : false);
        listing.setContactEnabled(true);
        listing.setIsDeleted(false);

        MarketplaceListing savedListing = listingRepository.save(listing);

        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            int order = 0;
            for (String url : request.getImageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    PostImage image = new PostImage();
                    image.setPostType("marketplace");
                    image.setPostId(savedListing.getId());
                    image.setImageUrl(url.trim());
                    image.setSortOrder(order++);
                    imageRepository.save(image);
                }
            }
        }

        return mapToListingResponse(savedListing);
    }

    public Page<MarketplaceListingResponse> getAllListings(BigDecimal minPrice, BigDecimal maxPrice, String status, Long vendorId, Pageable pageable) {
        Specification<MarketplaceListing> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("isDeleted")));

            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }
            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("status"), status.trim().toLowerCase()));
            }
            if (vendorId != null) {
                predicates.add(cb.equal(root.get("vendorId"), vendorId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return listingRepository.findAll(spec, pageable)
                .map(this::mapToListingResponse);
    }

    public MarketplaceListingResponse getListingById(Long id) {
        MarketplaceListing listing = listingRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Marketplace listing not found with ID: " + id));
        return mapToListingResponse(listing);
    }

    @Transactional
    public MarketplaceListingResponse updateListing(Long id, MarketplaceListingRequest request, Long studentId) {
        MarketplaceListing listing = listingRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Marketplace listing not found with ID: " + id));

        VendorProfile vendor = vendorProfileRepository.findById(listing.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for listing"));

        if (!vendor.getStudentId().equals(studentId)) {
            throw new RuntimeException("Not authorized to update this listing");
        }

        listing.setDescription(request.getDescription());
        listing.setPrice(request.getPrice());
        if (request.getShowStatus() != null) {
            listing.setShowStatus(request.getShowStatus());
        }

        MarketplaceListing saved = listingRepository.save(listing);

        if (request.getImageUrls() != null) {
            imageRepository.deleteByPostTypeAndPostId("marketplace", saved.getId());
            int order = 0;
            for (String url : request.getImageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    PostImage image = new PostImage();
                    image.setPostType("marketplace");
                    image.setPostId(saved.getId());
                    image.setImageUrl(url.trim());
                    image.setSortOrder(order++);
                    imageRepository.save(image);
                }
            }
        }

        return mapToListingResponse(saved);
    }

    @Transactional
    public MarketplaceListingResponse updateListingStatus(Long id, ListingStatusUpdateRequest request, Long studentId) {
        MarketplaceListing listing = listingRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Marketplace listing not found with ID: " + id));

        VendorProfile vendor = vendorProfileRepository.findById(listing.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for listing"));

        if (!vendor.getStudentId().equals(studentId)) {
            throw new RuntimeException("Not authorized to update status for this listing");
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            listing.setStatus(request.getStatus().trim().toLowerCase());
        }
        if (request.getShowStatus() != null) {
            listing.setShowStatus(request.getShowStatus());
        }

        MarketplaceListing saved = listingRepository.save(listing);
        return mapToListingResponse(saved);
    }

    @Transactional
    public void deleteListing(Long id, Long userId, String adminRole) {
        MarketplaceListing listing = listingRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Marketplace listing not found with ID: " + id));

        VendorProfile vendor = vendorProfileRepository.findById(listing.getVendorId())
                .orElseThrow(() -> new RuntimeException("Vendor profile not found for listing"));

        boolean isOwner = vendor.getStudentId().equals(userId);
        boolean isAdmin = "ADMIN".equals(adminRole);

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Not authorized to delete this listing");
        }

        listing.setIsDeleted(true);
        listing.setDeletedAt(LocalDateTime.now());
        listingRepository.save(listing);
    }

    private MarketplaceListingResponse mapToListingResponse(MarketplaceListing listing) {
        VendorSummaryDTO vendorSummary = null;
        if (listing.getVendorId() != null) {
            vendorSummary = vendorProfileRepository.findById(listing.getVendorId())
                    .map(v -> VendorSummaryDTO.builder()
                            .id(v.getId())
                            .vendorName(v.getVendorName())
                            .avgRating(v.getAvgRating())
                            .ratingCount(v.getRatingCount())
                            .build())
                    .orElse(null);
        }

        List<String> images = imageRepository.findByPostTypeAndPostId("marketplace", listing.getId())
                .stream()
                .map(PostImage::getImageUrl)
                .collect(Collectors.toList());

        String displayStatus = Boolean.TRUE.equals(listing.getShowStatus()) ? listing.getStatus() : null;

        return MarketplaceListingResponse.builder()
                .id(listing.getId())
                .vendor(vendorSummary)
                .description(listing.getDescription())
                .price(listing.getPrice())
                .status(displayStatus)
                .showStatus(listing.getShowStatus())
                .contactEnabled(listing.getContactEnabled() != null ? listing.getContactEnabled() : true)
                .createdAt(listing.getCreatedAt())
                .imageUrls(images)
                .build();
    }
}

