package com.campus360.service;

import com.campus360.dto.MaterialFileDTO;
import com.campus360.dto.MaterialShareRequest;
import com.campus360.dto.MaterialShareResponse;
import com.campus360.dto.OwnerDTO;
import com.campus360.entity.MaterialFile;
import com.campus360.entity.MaterialShare;
import com.campus360.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MaterialShareService {

    @Autowired
    private MaterialShareRepository materialShareRepository;

    @Autowired
    private MaterialFileRepository fileRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private TrimesterRepository trimesterRepository;

    private MaterialShareResponse mapToResponse(MaterialShare share) {
        MaterialShareResponse response = new MaterialShareResponse();
        response.setId(share.getId());
        response.setTitle(share.getTitle());
        response.setDescription(share.getDescription());
        response.setVisits(share.getVisits());
        response.setCreatedAt(share.getCreatedAt());

        OwnerDTO owner = new OwnerDTO();
        owner.setType("student");
        owner.setId(share.getStudentId());
        studentRepository.findById(share.getStudentId()).ifPresent(student -> {
            owner.setName(student.getFullName());
        });
        response.setPostedBy(owner);

        departmentRepository.findById(share.getDepartmentId().longValue()).ifPresent(d -> {
            response.setDepartmentName(d.getName());
        });
        
        courseRepository.findById(share.getCourseId().longValue()).ifPresent(c -> {
            response.setCourseName(c.getCourseName());
        });
        
        trimesterRepository.findById(share.getTrimesterId().longValue()).ifPresent(t -> {
            response.setTrimesterName(t.getName());
        });

        List<MaterialFileDTO> files = fileRepository.findByMaterialShareId(share.getId())
                .stream()
                .map(f -> {
                    MaterialFileDTO dto = new MaterialFileDTO();
                    dto.setId(f.getId());
                    dto.setFileUrl(f.getFileUrl());
                    dto.setOriginalFilename(f.getOriginalFilename());
                    dto.setFileType(f.getFileType());
                    return dto;
                })
                .collect(Collectors.toList());
        response.setFiles(files);

        return response;
    }

    @Transactional
    public MaterialShareResponse createMaterialShare(MaterialShareRequest request, Long studentId) {
        MaterialShare share = new MaterialShare();
        share.setStudentId(studentId);
        share.setDepartmentId(request.getDepartmentId().intValue());
        share.setCourseId(request.getCourseId().intValue());
        share.setTrimesterId(request.getTrimesterId().intValue());
        share.setTitle(request.getTitle());
        share.setDescription(request.getDescription());
        share.setVisits(0);
        share.setIsDeleted(false);

        MaterialShare saved = materialShareRepository.save(share);

        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (MaterialFileDTO fileDto : request.getFiles()) {
                MaterialFile file = new MaterialFile();
                file.setMaterialShareId(saved.getId());
                file.setFileUrl(fileDto.getFileUrl());
                file.setOriginalFilename(fileDto.getOriginalFilename());
                file.setFileType(fileDto.getFileType() != null ? fileDto.getFileType() : "other");
                file.setUploadedAt(LocalDateTime.now());
                fileRepository.save(file);
            }
        }

        return mapToResponse(saved);
    }

    public Page<MaterialShareResponse> getAllMaterialShares(Long deptId, Long courseId, Long trimId, Pageable pageable) {
        Integer dId = deptId != null ? deptId.intValue() : null;
        Integer cId = courseId != null ? courseId.intValue() : null;
        Integer tId = trimId != null ? trimId.intValue() : null;
        return materialShareRepository.findByFilters(dId, cId, tId, pageable).map(this::mapToResponse);
    }

    public MaterialShareResponse getMaterialShareById(Long id) {
        MaterialShare share = materialShareRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Material Share not found"));
        return mapToResponse(share);
    }

    @Transactional
    public void incrementVisits(Long id) {
        MaterialShare share = materialShareRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Material Share not found"));
        share.setVisits(share.getVisits() + 1);
        materialShareRepository.save(share);
    }

    @Transactional
    public MaterialShareResponse updateMaterialShare(Long id, MaterialShareRequest request, Long userId, String accountType, String role) {
        MaterialShare share = materialShareRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Material Share not found"));

        boolean isOwner = share.getStudentId().equals(userId) && "STUDENT".equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to edit this material share");
        }

        share.setTitle(request.getTitle());
        share.setDescription(request.getDescription());
        if (request.getDepartmentId() != null) share.setDepartmentId(request.getDepartmentId().intValue());
        if (request.getCourseId() != null) share.setCourseId(request.getCourseId().intValue());
        if (request.getTrimesterId() != null) share.setTrimesterId(request.getTrimesterId().intValue());
        
        MaterialShare saved = materialShareRepository.save(share);

        fileRepository.deleteByMaterialShareId(saved.getId());
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (MaterialFileDTO fileDto : request.getFiles()) {
                MaterialFile file = new MaterialFile();
                file.setMaterialShareId(saved.getId());
                file.setFileUrl(fileDto.getFileUrl());
                file.setOriginalFilename(fileDto.getOriginalFilename());
                file.setFileType(fileDto.getFileType() != null ? fileDto.getFileType() : "other");
                file.setUploadedAt(LocalDateTime.now());
                fileRepository.save(file);
            }
        }

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteMaterialShare(Long id, Long userId, String accountType, String role) {
        MaterialShare share = materialShareRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Material Share not found"));

        boolean isOwner = share.getStudentId().equals(userId) && "STUDENT".equalsIgnoreCase(accountType);
        if (!isOwner && !"ADMIN".equalsIgnoreCase(role)) {
            throw new RuntimeException("Not authorized to delete this material share");
        }

        share.setIsDeleted(true);
        share.setDeletedAt(LocalDateTime.now());
        materialShareRepository.save(share);
    }
}
