package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_versions", indexes = {
    @Index(name = "idx_file_version_material", columnList = "materialId"),
    @Index(name = "idx_file_version_created", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileVersion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long materialId;
    
    @Column(nullable = false)
    private Long uploaderId;
    
    @Column(nullable = false, length = 255)
    private String fileName;
    
    @Column(nullable = false, length = 100)
    private String fileType;
    
    @Column(nullable = false)
    private Long fileSize;
    
    @Column(nullable = false, length = 500)
    private String filePath;
    
    @Column(length = 64)
    private String fileHash;
    
    @Column(nullable = false)
    private Integer versionNumber;
    
    @Column(length = 500)
    private String changeDescription;
    
    @Column(nullable = false)
    private Boolean isCurrent;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isCurrent == null) {
            isCurrent = true;
        }
    }
}
