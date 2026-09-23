package com.campus360.service;

import com.campus360.dto.ComplaintRequest;
import com.campus360.dto.ComplaintResponse;
import com.campus360.dto.ComplaintStatusUpdateRequest;
import com.campus360.entity.Complaint;
import com.campus360.entity.Student;
import com.campus360.repository.ComplaintRepository;
import com.campus360.repository.StudentRepository;
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
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceTest {

    @Mock
    private ComplaintRepository complaintRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private com.campus360.repository.PostLikeRepository postLikeRepository;

    @InjectMocks
    private ComplaintService complaintService;

    private Complaint mockComplaint;
    private Student mockStudent;

    @BeforeEach
    void setUp() {
        mockComplaint = new Complaint();
        mockComplaint.setId(1L);
        mockComplaint.setStudentId(100L);
        mockComplaint.setDescription("Broken projector in Room 302");
        mockComplaint.setStatus("not_approved");
        mockComplaint.setIsDeleted(false);

        mockStudent = new Student();
        mockStudent.setId(100L);
        mockStudent.setFullName("John Doe");
    }

    @Test
    @DisplayName("Create Complaint - Success")
    void testCreateComplaint_Success() {
        ComplaintRequest request = new ComplaintRequest();
        request.setDescription("Broken projector in Room 302");

        when(complaintRepository.save(any(Complaint.class))).thenReturn(mockComplaint);
        when(studentRepository.findById(100L)).thenReturn(Optional.of(mockStudent));

        ComplaintResponse response = complaintService.createComplaint(request, 100L);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("Broken projector in Room 302", response.getDescription());
        assertEquals("not_approved", response.getStatus());
        assertEquals("John Doe", response.getStudentName());
        verify(complaintRepository, times(1)).save(any(Complaint.class));
    }

    @Test
    @DisplayName("Get All Complaints with status filter")
    void testGetAllComplaints_WithStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Complaint> page = new PageImpl<>(Collections.singletonList(mockComplaint));

        when(complaintRepository.findByIsDeletedFalseAndStatus("not_approved", pageable)).thenReturn(page);
        when(studentRepository.findById(100L)).thenReturn(Optional.of(mockStudent));
        when(postLikeRepository.countByPostTypeAndPostIdAndReaction(anyString(), anyLong(), anyString())).thenReturn(0);

        Page<ComplaintResponse> result = complaintService.getAllComplaints("not_approved", pageable, null);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Broken projector in Room 302", result.getContent().get(0).getDescription());
    }

    @Test
    @DisplayName("Get Complaint By Id - Success")
    void testGetComplaintById_Success() {
        when(complaintRepository.findById(1L)).thenReturn(Optional.of(mockComplaint));
        when(studentRepository.findById(100L)).thenReturn(Optional.of(mockStudent));
        when(postLikeRepository.countByPostTypeAndPostIdAndReaction(anyString(), anyLong(), anyString())).thenReturn(0);

        ComplaintResponse response = complaintService.getComplaintById(1L, null);

        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("John Doe", response.getStudentName());
    }

    @Test
    @DisplayName("Get Complaint By Id - Not Found")
    void testGetComplaintById_NotFound() {
        when(complaintRepository.findById(99L)).thenReturn(Optional.empty());

        org.springframework.web.server.ResponseStatusException exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> {
            complaintService.getComplaintById(99L, null);
        });

        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    @DisplayName("Update Complaint - Unauthorized User")
    void testUpdateComplaint_Unauthorized() {
        when(complaintRepository.findById(1L)).thenReturn(Optional.of(mockComplaint));

        ComplaintRequest request = new ComplaintRequest();
        request.setDescription("New description");

        org.springframework.web.server.ResponseStatusException exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> {
            complaintService.updateComplaint(1L, request, 999L);
        });

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("Update Complaint Status - Success by Authority")
    void testUpdateStatus_Success() {
        when(complaintRepository.findById(1L)).thenReturn(Optional.of(mockComplaint));
        when(complaintRepository.save(any(Complaint.class))).thenReturn(mockComplaint);
        when(studentRepository.findById(100L)).thenReturn(Optional.of(mockStudent));

        ComplaintStatusUpdateRequest request = new ComplaintStatusUpdateRequest();
        request.setStatus("in_progress");

        ComplaintResponse response = complaintService.updateStatus(1L, request, 200L);

        assertNotNull(response);
        verify(complaintRepository).save(mockComplaint);
        assertEquals("in_progress", mockComplaint.getStatus());
        assertEquals(200L, mockComplaint.getHandledBy());
    }

    @Test
    @DisplayName("Soft Delete Complaint - Success by Student Owner")
    void testDeleteComplaint_ByOwner() {
        when(complaintRepository.findById(1L)).thenReturn(Optional.of(mockComplaint));

        complaintService.deleteComplaint(1L, 100L, "STUDENT");

        assertTrue(mockComplaint.getIsDeleted());
        assertNotNull(mockComplaint.getDeletedAt());
        verify(complaintRepository).save(mockComplaint);
    }

    @Test
    @DisplayName("Soft Delete Complaint - Forbidden for Other Students")
    void testDeleteComplaint_Forbidden() {
        when(complaintRepository.findById(1L)).thenReturn(Optional.of(mockComplaint));

        org.springframework.web.server.ResponseStatusException exception = assertThrows(
                org.springframework.web.server.ResponseStatusException.class, () -> {
            complaintService.deleteComplaint(1L, 999L, "STUDENT");
        });

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getStatusCode());
    }
}
