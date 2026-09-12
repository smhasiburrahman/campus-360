package com.campus360.repository;

import com.campus360.entity.MaterialFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MaterialFileRepository extends JpaRepository<MaterialFile, Long> {
    List<MaterialFile> findByMaterialShareId(Long shareId);
    void deleteByMaterialShareId(Long shareId);
}
