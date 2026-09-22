package com.campus360.repository;

import com.campus360.entity.Complaint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    Page<Complaint> findByIsDeletedFalse(Pageable pageable);
    Page<Complaint> findByIsDeletedFalseAndStatus(String status, Pageable pageable);
    Page<Complaint> findByIsDeletedFalseAndStudentId(Long studentId, Pageable pageable);
}
