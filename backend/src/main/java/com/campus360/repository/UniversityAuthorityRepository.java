package com.campus360.repository;

import com.campus360.entity.UniversityAuthority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UniversityAuthorityRepository extends JpaRepository<UniversityAuthority, Long> {
    Optional<UniversityAuthority> findByEmail(String email);
}
