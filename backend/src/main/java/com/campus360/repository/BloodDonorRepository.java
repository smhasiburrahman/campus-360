package com.campus360.repository;

import com.campus360.entity.BloodDonor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BloodDonorRepository extends JpaRepository<BloodDonor, Long> {

    Optional<BloodDonor> findByStudentId(Long studentId);

    List<BloodDonor> findByBloodGroupAndIsAvailableTrue(String bloodGroup);

    List<BloodDonor> findByIsAvailableTrue();

    List<BloodDonor> findByBloodGroupInAndIsAvailableTrue(List<String> bloodGroups);

    @Query("SELECT d FROM BloodDonor d WHERE (:bloodGroup IS NULL OR d.bloodGroup = :bloodGroup) AND (:isAvailable IS NULL OR d.isAvailable = :isAvailable) ORDER BY d.isAvailable DESC, d.totalDonations DESC, d.createdAt DESC")
    List<BloodDonor> filterDonors(@Param("bloodGroup") String bloodGroup, @Param("isAvailable") Boolean isAvailable);
}
