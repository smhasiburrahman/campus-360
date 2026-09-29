package com.campus360.repository;

import com.campus360.entity.BloodDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BloodDonationRepository extends JpaRepository<BloodDonation, Long> {

    List<BloodDonation> findByDonorIdOrderByDonationDateDesc(Long donorId);

    List<BloodDonation> findByRequestId(Long requestId);
}
