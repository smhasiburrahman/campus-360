package com.campus360.controller;

import com.campus360.dto.EventRequest;
import com.campus360.dto.EventResponse;
import com.campus360.service.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    @Autowired
    private EventService eventService;

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
    @PreAuthorize("hasRole('CLUB') or hasRole('AUTHORITY')")
    public ResponseEntity<EventResponse> createEvent(@RequestBody EventRequest request, Authentication authentication) {
        Long ownerId = Long.parseLong(authentication.getName());
        String ownerType = getAccountType(authentication);
        return ResponseEntity.ok(eventService.createEvent(request, ownerId, ownerType));
    }

    @GetMapping
    public ResponseEntity<Page<EventResponse>> getAllEvents(
            @RequestParam(required = false) Boolean upcoming,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(eventService.getAllEvents(upcoming, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @RequestBody EventRequest request,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        return ResponseEntity.ok(eventService.updateEvent(id, request, userId, accountType, adminRole));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        String accountType = getAccountType(authentication);
        String adminRole = getAdminRole(authentication);
        eventService.deleteEvent(id, userId, accountType, adminRole);
        return ResponseEntity.noContent().build();
    }
}
