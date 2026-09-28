package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

/**
 * 论坛回帖实体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "forum_replies", indexes = {
    @Index(name = "idx_fr_post", columnList = "post_id"),
    @Index(name = "idx_fr_author", columnList = "author_id")
})
public class ForumReply {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "post_id", nullable = false)
    private ForumPost post;
    
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;
    
    @Column(name = "like_count")
    private Integer likeCount;
    
    /** 楼主采纳的最佳回复 */
    @Column(name = "accepted")
    private Boolean accepted;
    
    /** 当前用户是否点赞(非持久化,接口返回用) */
    @Transient
    private Boolean liked;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (likeCount == null) likeCount = 0;
        if (accepted == null) accepted = false;
    }
}
