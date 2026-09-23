package com.campus360.service;

import com.campus360.dto.ComplaintRequest;
import com.campus360.dto.ComplaintResponse;
import com.campus360.dto.ComplaintStatusUpdateRequest;
import com.campus360.entity.Complaint;
import com.campus360.entity.Student;
import com.campus360.entity.PostLike;
import com.campus360.repository.ComplaintRepository;
import com.campus360.repository.StudentRepository;
import com.campus360.repository.PostLikeRepository;
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

    @Autowired
    private PostLikeRepository postLikeRepository;

    public ComplaintResponse createComplaint(ComplaintRequest request, Long studentId) {
        Complaint complaint = new Complaint();
        complaint.setStudentId(studentId);
        complaint.setTitle(request.getTitle());
        complaint.setCategory(request.getCategory());
        complaint.setLocation(request.getLocation());
        complaint.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
        complaint.setDescription(request.getDescription());
        complaint.setStatus("not_approved");
        complaint.setIsDeleted(false);
        Complaint saved = complaintRepository.save(complaint);
        return mapToResponse(saved, studentId);
    }

    public Page<ComplaintResponse> getAllComplaints(String status, Pageable pageable, Long currentUserId) {
        Page<Complaint> complaints;
        if (status != null && !status.isEmpty()) {
            complaints = complaintRepository.findByIsDeletedFalseAndStatus(status, pageable);
        } else {
            complaints = complaintRepository.findByIsDeletedFalse(pageable);
        }
        return complaints.map(c -> mapToResponse(c, currentUserId));
    }

    public ComplaintResponse getComplaintById(Long id, Long currentUserId) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        return mapToResponse(complaint, currentUserId);
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
        return mapToResponse(updated, userId);
    }

    public ComplaintResponse updateStatus(Long id, ComplaintStatusUpdateRequest request, Long authorityId) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
                
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        
        if ("handled".equals(complaint.getStatus()) || "denied".equals(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Complaint is already resolved and cannot be changed");
        }
        
        if ("processing".equals(complaint.getStatus()) && "pending".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot move complaint back to pending");
        }
        
        complaint.setStatus(request.getStatus());
        complaint.setHandledBy(authorityId);
        complaint.setStatusUpdatedAt(LocalDateTime.now());
        Complaint updated = complaintRepository.save(complaint);
        return mapToResponse(updated, authorityId);
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

    public void reactToComplaint(Long complaintId, String reaction, Long studentId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
                
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }
        
        if ("handled".equals(complaint.getStatus()) || "denied".equals(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot vote on resolved complaints");
        }

        PostLike existingLike = postLikeRepository.findByPostTypeAndPostIdAndStudentId("complaint", complaintId, studentId)
                .orElse(null);

        if (reaction == null) {
            if (existingLike != null) {
                postLikeRepository.delete(existingLike);
            }
        } else {
            if (existingLike != null) {
                existingLike.setReaction(reaction);
                postLikeRepository.save(existingLike);
            } else {
                PostLike newLike = new PostLike();
                newLike.setPostType("complaint");
                newLike.setPostId(complaintId);
                newLike.setStudentId(studentId);
                newLike.setReaction(reaction);
                postLikeRepository.save(newLike);
            }
        }

        int upvotes = postLikeRepository.countByPostTypeAndPostIdAndReaction("complaint", complaintId, "like");
        
        if (upvotes >= 1 && "not_approved".equals(complaint.getStatus())) {
            complaint.setStatus("pending");
            complaintRepository.save(complaint);
        } else if (upvotes < 1 && "pending".equals(complaint.getStatus())) {
            complaint.setStatus("not_approved");
            complaintRepository.save(complaint);
        }
    }

    private ComplaintResponse mapToResponse(Complaint complaint, Long currentUserId) {
        ComplaintResponse response = new ComplaintResponse();
        response.setId(complaint.getId());
        response.setStudentId(complaint.getStudentId());
        response.setTitle(complaint.getTitle());
        response.setCategory(complaint.getCategory());
        response.setLocation(complaint.getLocation());
        response.setIsAnonymous(complaint.getIsAnonymous());
        response.setDescription(complaint.getDescription());
        
        int upvotes = postLikeRepository.countByPostTypeAndPostIdAndReaction("complaint", complaint.getId(), "like");
        int downvotes = postLikeRepository.countByPostTypeAndPostIdAndReaction("complaint", complaint.getId(), "dislike");
        
        response.setUpvoteCount(upvotes);
        response.setDownvoteCount(downvotes);
        response.setCommentCount(0);
        
        if (currentUserId != null) {
            postLikeRepository.findByPostTypeAndPostIdAndStudentId("complaint", complaint.getId(), currentUserId)
                    .ifPresent(postLike -> response.setUserReaction(postLike.getReaction()));
        }
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
