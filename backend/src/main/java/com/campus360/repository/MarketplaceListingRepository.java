package com.campus360.repository;

import com.campus360.entity.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

@Repository
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, Long>, JpaSpecificationExecutor<MarketplaceListing> {
    Page<MarketplaceListing> findByIsDeletedFalse(Pageable pageable);
    Optional<MarketplaceListing> findByIdAndIsDeletedFalse(Long id);
    Page<MarketplaceListing> findByVendorIdAndIsDeletedFalse(Long vendorId, Pageable pageable);
}
