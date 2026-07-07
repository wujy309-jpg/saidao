package com.training.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "file_comments", indexes = {
    @Index(name = "idx_file_comment_material", columnList = "materialId"),
    @Index(name = "idx_file_comment_version", columnList = "versionId")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileComment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long materialId;
    
    @Column(nullable = false)
    private Long versionId;
    
    @Column(nullable = false)
    private Long userId;
    
    @Column(nullable = false, length = 2000)
    private String content;
    
    @Column(length = 100)
    private String lineReference;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private FileComment parent;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
