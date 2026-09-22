package com.campus360.repository;

import com.campus360.entity.VendorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface VendorReviewRepository extends JpaRepository<VendorReview, Long> {
    Page<VendorReview> findByVendorId(Long vendorId, Pageable pageable);
    boolean existsByVendorIdAndReviewerId(Long vendorId, Long reviewerId);
}
