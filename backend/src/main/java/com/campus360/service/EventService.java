package com.campus360.service;

import com.campus360.dto.EventRequest;
import com.campus360.dto.EventResponse;
import com.campus360.dto.OwnerDTO;
import com.campus360.entity.Event;
import com.campus360.entity.PostImage;
import com.campus360.repository.EventRepository;
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
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private PostImageRepository imageRepository;

    @Autowired
    private ClubRepository clubRepository;

    @Autowired
    private UniversityAuthorityRepository authorityRepository;

    private EventResponse mapToResponse(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
        response.setTitle(event.getTitle());
        response.setDescription(event.getDescription());
        response.setTime(event.getTime());
        response.setLocation(event.getLocation());
        response.setOrganizerDetails(event.getOrganizerDetails());
        response.setRegistrationLink(event.getRegistrationLink());
        response.setEventDate(event.getEventDate());
        response.setCreatedAt(event.getCreatedAt());

        OwnerDTO owner = new OwnerDTO();
        owner.setType(event.getOwnerType());
        owner.setId(event.getOwnerId());
        
        if ("club".equalsIgnoreCase(event.getOwnerType())) {
            clubRepository.findById(event.getOwnerId()).ifPresent(club -> {
                owner.setName(club.getClubName());
            });
        } else if ("authority".equalsIgnoreCase(event.getOwnerType())) {
            authorityRepository.findById(event.getOwnerId()).ifPresent(auth -> {
                owner.setName(auth.getFullName());
            });
        }
        response.setPostedBy(owner);

        List<String> images = imageRepository.findByPostTypeAndPostId("event", event.getId())
                .stream()
                .map(PostImage::getImageUrl)
                .collect(Collectors.toList());
        response.setImageUrls(images);

        return response;
    }

    @Transactional
    public EventResponse createEvent(EventRequest request, Long ownerId, String ownerType) {
        Event event = new Event();
        event.setOwnerType(ownerType.toLowerCase());
        event.setOwnerId(ownerId);
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setTime(request.getTime());
        event.setLocation(request.getLocation());
        event.setOrganizerDetails(request.getOrganizerDetails());
        event.setRegistrationLink(request.getRegistrationLink());
        event.setEventDate(request.getEventDate());
        event.setIsDeleted(false);

        Event saved = eventRepository.save(event);

        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("event");
                image.setPostId(saved.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(saved);
    }

    public Page<EventResponse> getAllEvents(Boolean upcoming, Pageable pageable) {
        return eventRepository.findEvents(upcoming, pageable).map(this::mapToResponse);
    }

    public EventResponse getEventById(Long id) {
        Event event = eventRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        return mapToResponse(event);
    }

    @Transactional
    public EventResponse updateEvent(Long id, EventRequest request, Long userId, String accountType, String role) {
        Event event = eventRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        boolean isOwner = event.getOwnerId().equals(userId) && event.getOwnerType().equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to edit this event");
        }

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setTime(request.getTime());
        event.setLocation(request.getLocation());
        event.setOrganizerDetails(request.getOrganizerDetails());
        event.setRegistrationLink(request.getRegistrationLink());
        event.setEventDate(request.getEventDate());
        
        Event saved = eventRepository.save(event);

        imageRepository.deleteByPostTypeAndPostId("event", saved.getId());
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            Integer order = 0;
            for (String url : request.getImageUrls()) {
                PostImage image = new PostImage();
                image.setPostType("event");
                image.setPostId(saved.getId());
                image.setImageUrl(url);
                image.setSortOrder(order++);
                imageRepository.save(image);
            }
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteEvent(Long id, Long userId, String accountType, String role) {
        Event event = eventRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        boolean isOwner = event.getOwnerId().equals(userId) && event.getOwnerType().equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to delete this event");
        }

        event.setIsDeleted(true);
        event.setDeletedAt(LocalDateTime.now());
        eventRepository.save(event);
    }
}
