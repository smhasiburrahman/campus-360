package com.campus360.repository;

import com.campus360.entity.MaterialShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialShareRepository extends JpaRepository<MaterialShare, Long> {
}
