package com.campus360.service;

import com.campus360.dto.ComplaintRequest;
import com.campus360.dto.ComplaintResponse;
import com.campus360.dto.ComplaintStatusUpdateRequest;
import com.campus360.entity.Complaint;
import com.campus360.entity.Student;
import com.campus360.repository.ComplaintRepository;
import com.campus360.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private StudentRepository studentRepository;

    public ComplaintResponse createComplaint(ComplaintRequest request, Long studentId) {
        Complaint complaint = new Complaint();
        complaint.setStudentId(studentId);
        complaint.setDescription(request.getDescription());
        complaint.setStatus("not_approved");
        complaint.setIsDeleted(false);
        Complaint saved = complaintRepository.save(complaint);
        return mapToResponse(saved);
    }

    public Page<ComplaintResponse> getAllComplaints(String status, Pageable pageable) {
        Page<Complaint> complaints;
        if (status != null && !status.isEmpty()) {
            complaints = complaintRepository.findByIsDeletedFalseAndStatus(status, pageable);
        } else {
            complaints = complaintRepository.findByIsDeletedFalse(pageable);
        }
        return complaints.map(this::mapToResponse);
    }

    public ComplaintResponse getComplaintById(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        return mapToResponse(complaint);
    }

    public ComplaintResponse updateComplaint(Long id, ComplaintRequest request, Long userId) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        
        if (!complaint.getStudentId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to update this complaint");
        }
        
        complaint.setDescription(request.getDescription());
        Complaint updated = complaintRepository.save(complaint);
        return mapToResponse(updated);
    }

    public ComplaintResponse updateStatus(Long id, ComplaintStatusUpdateRequest request, Long authorityId) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
                
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        
        complaint.setStatus(request.getStatus());
        complaint.setHandledBy(authorityId);
        complaint.setStatusUpdatedAt(LocalDateTime.now());
        Complaint updated = complaintRepository.save(complaint);
        return mapToResponse(updated);
    }

    public void deleteComplaint(Long id, Long userId, String adminRole) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
                
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            return;
        }
        
        if (!complaint.getStudentId().equals(userId) && !"ADMIN".equals(adminRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorized to delete this complaint");
        }
        
        complaint.setIsDeleted(true);
        complaint.setDeletedAt(LocalDateTime.now());
        complaintRepository.save(complaint);
    }

    private ComplaintResponse mapToResponse(Complaint complaint) {
        ComplaintResponse response = new ComplaintResponse();
        response.setId(complaint.getId());
        response.setStudentId(complaint.getStudentId());
        response.setDescription(complaint.getDescription());
        response.setStatus(complaint.getStatus());
        response.setHandledBy(complaint.getHandledBy());
        response.setStatusUpdatedAt(complaint.getStatusUpdatedAt());
        response.setCreatedAt(complaint.getCreatedAt());
        response.setUpdatedAt(complaint.getUpdatedAt());
        
        studentRepository.findById(complaint.getStudentId()).ifPresent(student -> {
            response.setStudentName(student.getFullName());
        });
        
        return response;
    }
}
