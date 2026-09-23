package com.campus360.controller;

import com.campus360.dto.ComplaintRequest;
import com.campus360.dto.ComplaintResponse;
import com.campus360.dto.ComplaintStatusUpdateRequest;
import com.campus360.service.ComplaintService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ComplaintControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ComplaintService complaintService;

    @InjectMocks
    private ComplaintController complaintController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(complaintController).build();
    }

    @Test
    @DisplayName("POST /api/v1/complaints - Create Complaint")
    void testCreateComplaint() throws Exception {
        ComplaintRequest request = new ComplaintRequest();
        request.setDescription("Water leakage in Lab 4");

        ComplaintResponse response = new ComplaintResponse();
        response.setId(10L);
        response.setDescription("Water leakage in Lab 4");
        response.setStatus("not_approved");

        when(complaintService.createComplaint(any(ComplaintRequest.class), eq(5L))).thenReturn(response);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "5", null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))
        );

        mockMvc.perform(post("/api/v1/complaints")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.description").value("Water leakage in Lab 4"))
                .andExpect(jsonPath("$.status").value("not_approved"));
    }

    @Test
    @DisplayName("GET /api/v1/complaints - Get All Complaints")
    void testGetAllComplaints() {
        ComplaintResponse item = new ComplaintResponse();
        item.setId(1L);
        item.setDescription("AC not working");
        Page<ComplaintResponse> page = new PageImpl<>(Collections.singletonList(item));

        when(complaintService.getAllComplaints(eq(null), any(PageRequest.class), eq(null))).thenReturn(page);

        ResponseEntity<Page<ComplaintResponse>> response = complaintController.getAllComplaints(null, 0, 10, null);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getTotalElements());
        assertEquals("AC not working", response.getBody().getContent().get(0).getDescription());
    }

    @Test
    @DisplayName("GET /api/v1/complaints/{id} - Get Complaint By ID")
    void testGetComplaintById() throws Exception {
        ComplaintResponse item = new ComplaintResponse();
        item.setId(2L);
        item.setDescription("Wi-Fi unstable in library");

        when(complaintService.getComplaintById(2L, null)).thenReturn(item);

        mockMvc.perform(get("/api/v1/complaints/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.description").value("Wi-Fi unstable in library"));
    }

    @Test
    @DisplayName("PATCH /api/v1/complaints/{id}/status - Update Status")
    void testUpdateStatus() throws Exception {
        ComplaintStatusUpdateRequest request = new ComplaintStatusUpdateRequest();
        request.setStatus("resolved");

        ComplaintResponse response = new ComplaintResponse();
        response.setId(2L);
        response.setStatus("resolved");

        when(complaintService.updateStatus(eq(2L), any(ComplaintStatusUpdateRequest.class), eq(50L)))
                .thenReturn(response);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "50", null, List.of(new SimpleGrantedAuthority("ROLE_AUTHORITY"))
        );

        mockMvc.perform(patch("/api/v1/complaints/2/status")
                .principal(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("resolved"));
    }

    @Test
    @DisplayName("DELETE /api/v1/complaints/{id} - Delete Complaint")
    void testDeleteComplaint() throws Exception {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "10", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        mockMvc.perform(delete("/api/v1/complaints/5")
                .principal(auth))
                .andExpect(status().isNoContent());

        verify(complaintService, times(1)).deleteComplaint(5L, 10L, "ADMIN");
    }
}
