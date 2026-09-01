package com.campus360.repository;

import com.campus360.entity.VendorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VendorReviewRepository extends JpaRepository<VendorReview, Long> {
}
