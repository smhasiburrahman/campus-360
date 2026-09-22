package com.campus360.service;

import com.campus360.dto.*;
import com.campus360.entity.*;
import com.campus360.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class StudentService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PostBookmarkRepository bookmarkRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private LostFoundPostRepository lostFoundPostRepository;

    @Autowired
    private MarketplaceListingRepository marketplaceListingRepository;

    @Autowired
    private VendorProfileRepository vendorProfileRepository;

    @Autowired
    private MaterialShareRepository materialShareRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private EventRepository eventRepository;

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    @Transactional
    public StudentProfileResponse completeOnboarding(Long studentId, OnboardingRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));

        student.setUniversityId(request.getUniversityId());
        student.setFullName(request.getFullName());
        student.setDepartmentId(request.getDepartmentId());
        student.setOnboardingComplete(true);

        Student saved = studentRepository.save(student);
        return mapToProfileResponse(saved);
    }

    public StudentProfileResponse getMyProfile(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));
        return mapToProfileResponse(student);
    }

    @Transactional
    public StudentProfileResponse updateMyProfile(Long studentId, StudentProfileUpdateRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            student.setFullName(request.getFullName().trim());
        }
        if (request.getGender() != null) {
            student.setGender(request.getGender().trim());
        }
        if (request.getDepartmentId() != null) {
            student.setDepartmentId(request.getDepartmentId());
        }
        if (request.getProfilePictureUrl() != null) {
            student.setProfilePictureUrl(request.getProfilePictureUrl().trim());
        }

        Student saved = studentRepository.save(student);
        return mapToProfileResponse(saved);
    }

    public PublicStudentProfileResponse getPublicProfile(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found with ID: " + studentId));

        DepartmentDTO deptDTO = null;
        if (student.getDepartmentId() != null) {
            deptDTO = departmentRepository.findById(student.getDepartmentId())
                    .map(d -> DepartmentDTO.builder()
                            .id(d.getId())
                            .name(d.getName())
                            .code(d.getCode())
                            .build())
                    .orElse(null);
        }

        return PublicStudentProfileResponse.builder()
                .id(student.getId())
                .fullName(student.getFullName())
                .department(deptDTO)
                .profilePictureUrl(student.getProfilePictureUrl())
                .build();
    }

    private StudentProfileResponse mapToProfileResponse(Student student) {
        DepartmentDTO deptDTO = null;
        String deptName = null;
        if (student.getDepartmentId() != null) {
            Optional<Department> deptOpt = departmentRepository.findById(student.getDepartmentId());
            if (deptOpt.isPresent()) {
                Department d = deptOpt.get();
                deptName = d.getName();
                deptDTO = DepartmentDTO.builder()
                        .id(d.getId())
                        .name(d.getName())
                        .code(d.getCode())
                        .build();
            }
        }

        return StudentProfileResponse.builder()
                .id(student.getId())
                .email(student.getEmail())
                .universityId(student.getUniversityId())
                .fullName(student.getFullName())
                .department(deptDTO)
                .departmentId(student.getDepartmentId())
                .departmentName(deptName)
                .gender(student.getGender())
                .profilePictureUrl(student.getProfilePictureUrl())
                .onboardingComplete(student.getOnboardingComplete())
                .isActive(student.getIsActive())
                .createdAt(student.getCreatedAt())
                .build();
    }

    // ==========================================
    // BOOKMARKS MANAGEMENT
    // ==========================================

    private String normalizePostType(String postType) {
        if (postType == null) return null;
        String clean = postType.trim().toLowerCase().replace("-", "_");
        return clean;
    }

    @Transactional
    public void bookmarkPost(Long studentId, String rawPostType, Long postId) {
        String postType = normalizePostType(rawPostType);
        if (!bookmarkRepository.existsByStudentIdAndPostTypeAndPostId(studentId, postType, postId)) {
            PostBookmark bookmark = new PostBookmark();
            bookmark.setStudentId(studentId);
            bookmark.setPostType(postType);
            bookmark.setPostId(postId);
            bookmarkRepository.save(bookmark);
        }
    }

    @Transactional
    public void unbookmarkPost(Long studentId, String rawPostType, Long postId) {
        String postType = normalizePostType(rawPostType);
        bookmarkRepository.deleteByStudentIdAndPostTypeAndPostId(studentId, postType, postId);
    }

    public Page<StudentPostItemDTO> getMyBookmarks(Long studentId, String rawPostType, Pageable pageable) {
        String postType = normalizePostType(rawPostType);
        Page<PostBookmark> bookmarkPage;

        if (postType != null && !postType.isEmpty()) {
            bookmarkPage = bookmarkRepository.findByStudentIdAndPostType(studentId, postType, pageable);
        } else {
            bookmarkPage = bookmarkRepository.findByStudentId(studentId, pageable);
        }

        List<StudentPostItemDTO> items = bookmarkPage.getContent().stream()
                .map(this::hydrateBookmarkedPost)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());

        return new PageImpl<>(items, pageable, bookmarkPage.getTotalElements());
    }

    private StudentPostItemDTO hydrateBookmarkedPost(PostBookmark bookmark) {
        String type = bookmark.getPostType();
        Long postId = bookmark.getPostId();

        switch (type) {
            case "lost_found":
                return lostFoundPostRepository.findByIdAndIsDeletedFalse(postId).map(p -> {
                    List<String> images = imageRepository.findByPostTypeAndPostId("lost_found", p.getId())
                            .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                    String ownerName = studentRepository.findById(p.getStudentId())
                            .map(Student::getFullName).orElse(null);
                    return StudentPostItemDTO.builder()
                            .id(p.getId())
                            .postType("lost_found")
                            .title(p.getTitle() != null ? p.getTitle() : "Lost & Found Item")
                            .description(p.getDescription())
                            .status(p.getStatus())
                            .createdAt(p.getCreatedAt())
                            .imageUrls(images)
                            .ownerId(p.getStudentId())
                            .ownerName(ownerName)
                            .build();
                }).orElse(null);

            case "marketplace":
                return marketplaceListingRepository.findByIdAndIsDeletedFalse(postId).map(l -> {
                    List<String> images = imageRepository.findByPostTypeAndPostId("marketplace", l.getId())
                            .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                    String vendorName = vendorProfileRepository.findById(l.getVendorId())
                            .map(VendorProfile::getVendorName).orElse(null);
                    return StudentPostItemDTO.builder()
                            .id(l.getId())
                            .postType("marketplace")
                            .title("Marketplace Listing")
                            .description(l.getDescription())
                            .status(Boolean.TRUE.equals(l.getShowStatus()) ? l.getStatus() : null)
                            .createdAt(l.getCreatedAt())
                            .imageUrls(images)
                            .ownerId(l.getVendorId())
                            .ownerName(vendorName)
                            .build();
                }).orElse(null);

            case "material_share":
                return materialShareRepository.findByIdAndIsDeletedFalse(postId).map(m -> {
                    return StudentPostItemDTO.builder()
                            .id(m.getId())
                            .postType("material_share")
                            .title(m.getTitle())
                            .description(m.getDescription())
                            .status("available")
                            .createdAt(m.getCreatedAt())
                            .imageUrls(new ArrayList<>())
                            .ownerId(m.getStudentId())
                            .build();
                }).orElse(null);

            case "announcement":
                return announcementRepository.findById(postId).filter(a -> !Boolean.TRUE.equals(a.getIsDeleted())).map(a -> {
                    List<String> images = imageRepository.findByPostTypeAndPostId("announcement", a.getId())
                            .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                    return StudentPostItemDTO.builder()
                            .id(a.getId())
                            .postType("announcement")
                            .title(a.getTitle())
                            .description(a.getDescription())
                            .status("published")
                            .createdAt(a.getCreatedAt())
                            .imageUrls(images)
                            .ownerId(a.getOwnerId())
                            .build();
                }).orElse(null);

            case "event":
                return eventRepository.findById(postId).filter(e -> !Boolean.TRUE.equals(e.getIsDeleted())).map(e -> {
                    List<String> images = imageRepository.findByPostTypeAndPostId("event", e.getId())
                            .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                    return StudentPostItemDTO.builder()
                            .id(e.getId())
                            .postType("event")
                            .title(e.getTitle())
                            .description(e.getDescription())
                            .status("active")
                            .createdAt(e.getCreatedAt())
                            .imageUrls(images)
                            .ownerId(e.getOwnerId())
                            .build();
                }).orElse(null);

            default:
                return null;
        }
    }

    // ==========================================
    // STUDENT'S OWN POSTS
    // ==========================================

    public Page<StudentPostItemDTO> getMyPosts(Long studentId, String rawPostType, Pageable pageable) {
        String postType = normalizePostType(rawPostType);
        List<StudentPostItemDTO> allItems = new ArrayList<>();

        if (postType == null || postType.equals("lost_found")) {
            Page<LostFoundPost> lfPage = lostFoundPostRepository.findByStudentIdAndIsDeletedFalse(studentId, Pageable.unpaged());
            for (LostFoundPost p : lfPage) {
                List<String> images = imageRepository.findByPostTypeAndPostId("lost_found", p.getId())
                        .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                allItems.add(StudentPostItemDTO.builder()
                        .id(p.getId())
                        .postType("lost_found")
                        .title(p.getTitle() != null ? p.getTitle() : "Lost & Found Item")
                        .description(p.getDescription())
                        .status(p.getStatus())
                        .createdAt(p.getCreatedAt())
                        .imageUrls(images)
                        .ownerId(studentId)
                        .build());
            }
        }

        if (postType == null || postType.equals("marketplace")) {
            vendorProfileRepository.findByStudentId(studentId).ifPresent(vendor -> {
                Page<MarketplaceListing> mPage = marketplaceListingRepository.findByVendorIdAndIsDeletedFalse(vendor.getId(), Pageable.unpaged());
                for (MarketplaceListing l : mPage) {
                    List<String> images = imageRepository.findByPostTypeAndPostId("marketplace", l.getId())
                            .stream().map(PostImage::getImageUrl).collect(Collectors.toList());
                    allItems.add(StudentPostItemDTO.builder()
                            .id(l.getId())
                            .postType("marketplace")
                            .title("Marketplace Listing")
                            .description(l.getDescription())
                            .status(Boolean.TRUE.equals(l.getShowStatus()) ? l.getStatus() : null)
                            .createdAt(l.getCreatedAt())
                            .imageUrls(images)
                            .ownerId(studentId)
                            .build());
                }
            });
        }

        if (postType == null || postType.equals("material_share")) {
            Page<MaterialShare> matPage = materialShareRepository.findByStudentIdAndIsDeletedFalse(studentId, Pageable.unpaged());
            for (MaterialShare m : matPage) {
                allItems.add(StudentPostItemDTO.builder()
                        .id(m.getId())
                        .postType("material_share")
                        .title(m.getTitle())
                        .description(m.getDescription())
                        .status("available")
                        .createdAt(m.getCreatedAt())
                        .imageUrls(new ArrayList<>())
                        .ownerId(studentId)
                        .build());
            }
        }

        // Sort descending by createdAt
        allItems.sort(Comparator.comparing(StudentPostItemDTO::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allItems.size());
        List<StudentPostItemDTO> pagedList = (start <= allItems.size()) ? allItems.subList(start, end) : new ArrayList<>();

        return new PageImpl<>(pagedList, pageable, allItems.size());
    }
}
