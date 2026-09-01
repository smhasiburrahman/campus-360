package com.campus360.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "material_files")
public class MaterialFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "material_share_id", nullable = false)
    private Long materialShareId;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "uploaded_at", nullable = false)
    private java.time.LocalDateTime uploadedAt;

}
