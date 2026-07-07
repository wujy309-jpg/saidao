package com.training.backend.service;

import com.training.backend.entity.KnowledgeArticle;
import com.training.backend.repository.KnowledgeArticleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {
    
    private final KnowledgeArticleRepository knowledgeArticleRepository;
    
    @Transactional(readOnly = true)
    public List<KnowledgeArticle> searchArticles(String keyword) {
        return knowledgeArticleRepository.searchByKeyword(keyword);
    }
    
    @Transactional(readOnly = true)
    public List<KnowledgeArticle> getArticlesByCategory(String category) {
        return knowledgeArticleRepository.findByCategoryAndIsActiveTrueOrderByPriorityDesc(category);
    }
    
    @Transactional(readOnly = true)
    public List<KnowledgeArticle> getArticlesByLanguage(String language) {
        return knowledgeArticleRepository.findByLanguageAndIsActiveTrueOrderByPriorityDesc(language);
    }
    
    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return knowledgeArticleRepository.findAllCategories();
    }
    
    @Transactional(readOnly = true)
    public List<String> getAllLanguages() {
        return knowledgeArticleRepository.findAllLanguages();
    }
    
    public String loadKnowledgeFile(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8));
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (IOException e) {
            log.error("加载知识库文件失败: {}", path, e);
            return null;
        }
    }
    
    public String buildKnowledgeContext(String language, String topic) {
        StringBuilder context = new StringBuilder();
        
        String baseContent = loadKnowledgeFile("knowledge-base/" + language + "/core-concepts.md");
        if (baseContent != null) {
            context.append("# ").append(language).append("核心知识\n\n");
            context.append(baseContent).append("\n\n");
        }
        
        if ("java".equalsIgnoreCase(language)) {
            String springContent = loadKnowledgeFile("knowledge-base/java/spring-boot-guide.md");
            if (springContent != null) {
                context.append("# Spring Boot指南\n\n");
                context.append(springContent).append("\n\n");
            }
        }
        
        String bestPractice = loadKnowledgeFile("knowledge-base/best-practices/code-review.md");
        if (bestPractice != null) {
            context.append("# 代码评审最佳实践\n\n");
            context.append(bestPractice).append("\n\n");
        }
        
        List<KnowledgeArticle> articles = knowledgeArticleRepository.searchByKeyword(topic);
        if (!articles.isEmpty()) {
            context.append("# 相关知识文章\n\n");
            articles.stream().limit(5).forEach(article -> {
                context.append("## ").append(article.getTitle()).append("\n");
                context.append(article.getContent()).append("\n\n");
            });
        }
        
        return context.toString();
    }
}
