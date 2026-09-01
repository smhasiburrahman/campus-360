package com.campus360.repository;

import com.campus360.entity.MaterialFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialFileRepository extends JpaRepository<MaterialFile, Long> {
}
