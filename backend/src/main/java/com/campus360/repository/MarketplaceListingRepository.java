package com.campus360.repository;

import com.campus360.entity.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, Long> {
}
