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
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private com.campus360.repository.PostCommentRepository postCommentRepository;

    @Autowired
    private VectorStore vectorStore;

    @Autowired
    private GeminiApiClient geminiApiClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
        
        // Add to Vector Store for deduplication
        Document doc = new Document(request.getTitle() + " " + request.getDescription(), 
                Map.of("type", "complaint", "complaintId", saved.getId()));
        vectorStore.add(List.of(doc));
        
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

    public List<ComplaintResponse> checkDuplicates(String text) {
        FilterExpressionBuilder b = new FilterExpressionBuilder();
        SearchRequest searchRequest = SearchRequest.query(text)
                .withTopK(5)
                .withSimilarityThreshold(0.50)
                .withFilterExpression(b.eq("type", "complaint").build());

        List<Document> results = vectorStore.similaritySearch(searchRequest);

        return results.stream()
                .map(doc -> {
                    Long complaintId = ((Number) doc.getMetadata().get("complaintId")).longValue();
                    return complaintRepository.findById(complaintId).orElse(null);
                })
                .filter(c -> c != null && !Boolean.TRUE.equals(c.getIsDeleted()) && 
                        ("not_approved".equals(c.getStatus()) || "pending".equals(c.getStatus())))
                .map(c -> mapToResponse(c, null))
                .collect(Collectors.toList());
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
        if (request.getOfficialResponse() != null && !request.getOfficialResponse().isEmpty()) {
            complaint.setOfficialResponse(request.getOfficialResponse());
            
            // Auto-create a comment for the official response
            com.campus360.entity.PostComment comment = new com.campus360.entity.PostComment();
            comment.setPostType("complaint");
            comment.setPostId(complaint.getId());
            comment.setCommenterType("authority");
            comment.setCommenterId(authorityId);
            comment.setCommentText(request.getOfficialResponse());
            comment.setIsDeleted(false);
            postCommentRepository.save(comment);
        }
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
            
            // Trigger AI Triage
            try {
                String prompt = "Categorize this university complaint. Respond ONLY in JSON format containing 'department' (e.g., IT, Maintenance, Security) and 'priority' (e.g., Low, Medium, High, Urgent).\n\nComplaint: " + complaint.getDescription();
                String jsonResponse = geminiApiClient.generateContent(prompt);
                
                // Clean markdown from response if present
                if (jsonResponse.startsWith("```json")) {
                    jsonResponse = jsonResponse.substring(7);
                }
                if (jsonResponse.endsWith("```")) {
                    jsonResponse = jsonResponse.substring(0, jsonResponse.length() - 3);
                }
                
                JsonNode triageNode = objectMapper.readTree(jsonResponse);
                if (triageNode.has("department")) {
                    complaint.setDepartment(triageNode.get("department").asText());
                }
                if (triageNode.has("priority")) {
                    complaint.setPriority(triageNode.get("priority").asText());
                }
            } catch (Exception e) {
                System.err.println("AI Triage failed: " + e.getMessage());
            }

            complaintRepository.save(complaint);
        } else if (upvotes < 1 && "pending".equals(complaint.getStatus())) {
            complaint.setStatus("not_approved");
            complaintRepository.save(complaint);
        }
    }

    public java.util.List<com.campus360.dto.PostCommentDto> getComments(Long postId) {
        java.util.List<com.campus360.entity.PostComment> comments = postCommentRepository.findByPostTypeAndPostIdAndIsDeletedFalseOrderByCreatedAtAsc("complaint", postId);
        return comments.stream().map(c -> {
            String commenterName = "Unknown";
            if ("student".equals(c.getCommenterType())) {
                commenterName = studentRepository.findById(c.getCommenterId())
                        .map(s -> s.getFullName()).orElse("Student");
            } else {
                commenterName = "University Authority";
            }
            return com.campus360.dto.PostCommentDto.builder()
                    .id(c.getId())
                    .postType(c.getPostType())
                    .postId(c.getPostId())
                    .commenterType(c.getCommenterType())
                    .commenterId(c.getCommenterId())
                    .commenterName(commenterName)
                    .commentText(c.getCommentText())
                    .createdAt(c.getCreatedAt())
                    .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    public com.campus360.dto.PostCommentDto addComment(Long postId, com.campus360.dto.PostCommentRequest request, Long userId, String adminRole) {
        Complaint complaint = complaintRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (Boolean.TRUE.equals(complaint.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found");
        }

        com.campus360.entity.PostComment comment = new com.campus360.entity.PostComment();
        comment.setPostType("complaint");
        comment.setPostId(postId);
        
        if ("ADMIN".equals(adminRole)) {
            comment.setCommenterType("authority");
            comment.setCommenterId(userId);
        } else {
            comment.setCommenterType("student");
            comment.setCommenterId(userId);
        }
        
        comment.setCommentText(request.getCommentText());
        comment.setIsDeleted(false);
        com.campus360.entity.PostComment saved = postCommentRepository.save(comment);

        String commenterName = "ADMIN".equals(adminRole) ? "University Authority" : 
                studentRepository.findById(userId).map(s -> s.getFullName()).orElse("Student");

        return com.campus360.dto.PostCommentDto.builder()
                .id(saved.getId())
                .postType(saved.getPostType())
                .postId(saved.getPostId())
                .commenterType(saved.getCommenterType())
                .commenterId(saved.getCommenterId())
                .commenterName(commenterName)
                .commentText(saved.getCommentText())
                .createdAt(saved.getCreatedAt())
                .build();
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
        int commentCount = postCommentRepository.findByPostTypeAndPostIdAndIsDeletedFalseOrderByCreatedAtAsc("complaint", complaint.getId()).size();
        response.setCommentCount(commentCount);
        
        if (currentUserId != null) {
            postLikeRepository.findByPostTypeAndPostIdAndStudentId("complaint", complaint.getId(), currentUserId)
                    .ifPresent(postLike -> response.setUserReaction(postLike.getReaction()));
        }
        response.setStatus(complaint.getStatus());
        response.setHandledBy(complaint.getHandledBy());
        response.setDepartment(complaint.getDepartment());
        response.setPriority(complaint.getPriority());
        response.setOfficialResponse(complaint.getOfficialResponse());
        response.setStatusUpdatedAt(complaint.getStatusUpdatedAt());
        response.setCreatedAt(complaint.getCreatedAt());
        response.setUpdatedAt(complaint.getUpdatedAt());
        
        studentRepository.findById(complaint.getStudentId()).ifPresent(student -> {
            response.setStudentName(student.getFullName());
        });
        
        return response;
    }
}
