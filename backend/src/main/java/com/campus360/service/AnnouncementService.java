package com.campus360.service;

import com.campus360.dto.AnnouncementRequest;
import com.campus360.dto.AnnouncementResponse;
import com.campus360.dto.OwnerDTO;
import com.campus360.entity.Announcement;
import com.campus360.entity.PostImage;
import com.campus360.repository.AnnouncementRepository;
import com.campus360.repository.ClubRepository;
import com.campus360.repository.PostImageRepository;
import com.campus360.repository.UniversityAuthorityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private ClubRepository clubRepository;

    @Autowired
    private UniversityAuthorityRepository authorityRepository;

    private AnnouncementResponse mapToResponse(Announcement announcement) {
        AnnouncementResponse response = new AnnouncementResponse();
        response.setId(announcement.getId());
        response.setTitle(announcement.getTitle());
        response.setCategory(announcement.getCategory());
        response.setDescription(announcement.getDescription());
        response.setCreatedAt(announcement.getCreatedAt());

        OwnerDTO owner = new OwnerDTO();
        owner.setType(announcement.getOwnerType());
        owner.setId(announcement.getOwnerId());
        
        if ("club".equalsIgnoreCase(announcement.getOwnerType())) {
            clubRepository.findById(announcement.getOwnerId()).ifPresent(club -> {
                owner.setName(club.getClubName());
            });
        } else if ("authority".equalsIgnoreCase(announcement.getOwnerType())) {
            authorityRepository.findById(announcement.getOwnerId()).ifPresent(auth -> {
                owner.setName(auth.getFullName());
            });
        }
        response.setPostedBy(owner);

        List<String> images = imageRepository.findByPostTypeAndPostId("announcement", announcement.getId())
                .stream()
                .map(PostImage::getImageUrl)
                .collect(Collectors.toList());
        response.setImageUrls(images);

        return response;
    }

    @Transactional
    public AnnouncementResponse createPost(AnnouncementRequest request, Long ownerId, String ownerType) {
        Announcement announcement = new Announcement();
        announcement.setOwnerType(ownerType.toLowerCase());
        announcement.setOwnerId(ownerId);
        announcement.setTitle(request.getTitle());
        announcement.setCategory(request.getCategory());
        announcement.setDescription(request.getDescription());
        announcement.setIsDeleted(false);

        Announcement saved = announcementRepository.save(announcement);

        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("announcement");
                image.setPostId(saved.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(saved);
    }

    public Page<AnnouncementResponse> getAllPosts(String category, Pageable pageable) {
        if (category != null && !category.isEmpty()) {
            return announcementRepository.findByIsDeletedFalseAndCategoryOptional(category, pageable).map(this::mapToResponse);
        }
        return announcementRepository.findByIsDeletedFalse(pageable).map(this::mapToResponse);
    }

    public AnnouncementResponse getPostById(Long id) {
        Announcement announcement = announcementRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        return mapToResponse(announcement);
    }

    @Transactional
    public AnnouncementResponse updatePost(Long id, AnnouncementRequest request, Long userId, String accountType, String role) {
        Announcement announcement = announcementRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));

        boolean isOwner = announcement.getOwnerId().equals(userId) && announcement.getOwnerType().equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to edit this announcement");
        }

        announcement.setTitle(request.getTitle());
        announcement.setCategory(request.getCategory());
        announcement.setDescription(request.getDescription());
        Announcement saved = announcementRepository.save(announcement);

        imageRepository.deleteByPostTypeAndPostId("announcement", saved.getId());
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("announcement");
                image.setPostId(saved.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void deletePost(Long id, Long userId, String accountType, String role) {
        Announcement announcement = announcementRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));

        boolean isOwner = announcement.getOwnerId().equals(userId) && announcement.getOwnerType().equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to delete this announcement");
        }

        announcement.setIsDeleted(true);
        announcement.setDeletedAt(LocalDateTime.now());
        announcementRepository.save(announcement);
    }
}
