package com.training.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.backend.dto.AiReviewResponse;
import com.training.backend.dto.ReviewCriteriaResponse;
import com.training.backend.dto.ReviewDimensionResponse;
import com.training.backend.entity.AiReview;
import com.training.backend.entity.AiReview.ReviewType;
import com.training.backend.entity.TrainingMaterial;
import com.training.backend.entity.TrainingMaterial.MaterialStatus;
import com.training.backend.repository.AiReviewRepository;
import com.training.backend.repository.TrainingMaterialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AI评审服务 - 接入DeepSeek AI
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiReviewService {
    
    private final AiReviewRepository aiReviewRepository;
    private final TrainingMaterialRepository materialRepository;
    private final DeepSeekService deepSeekService;
    private final ObjectMapper objectMapper;
    private final ReviewCriteriaService reviewCriteriaService;
    
    @Value("${file.upload-dir}")
    private String uploadDir;
    
    /**
     * 异步评审材料
     */
    @Async
    @Transactional
    public void reviewMaterial(Long materialId) {
        log.info("开始AI评审材料: {}", materialId);
        
        TrainingMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new RuntimeException("材料不存在"));
        
        // 更新状态为AI评审中
        material.setStatus(MaterialStatus.AI_REVIEWING);
        materialRepository.save(material);
        
        long startTime = System.currentTimeMillis();
        
        try {
            // 根据材料类型进行评审
            AiReview review;
            if (material.getMaterialType() == TrainingMaterial.MaterialType.CODE) {
                review = reviewCode(material);
            } else {
                review = reviewDocument(material);
            }
            
            // 保存评审结果
            AiReview savedReview = aiReviewRepository.save(review);
            
            // 更新材料的AI评分
            material.setAiScore(savedReview.getTotalScore());
            material.setAiFeedback(savedReview.getFeedback());
            material.setStatus(MaterialStatus.AI_REVIEWED);
            materialRepository.save(material);
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("材料 {} AI评审完成，耗时: {}ms，评分: {}", materialId, duration, savedReview.getTotalScore());
            
        } catch (Exception e) {
            log.error("AI评审失败", e);
            material.setStatus(MaterialStatus.SUBMITTED);
            materialRepository.save(material);
        }
    }
    
    /**
     * 评审代码 - 使用DeepSeek AI
     */
    private AiReview reviewCode(TrainingMaterial material) {
        AiReview review = new AiReview();
        review.setMaterial(material);
        review.setReviewType(ReviewType.CODE_ANALYSIS);
        
        try {
            // 读取代码文件
            Path filePath = Paths.get(uploadDir, material.getFilePath());
            String codeContent = Files.readString(filePath);
            
            // 确定编程语言
            String language = detectLanguage(material.getFileName());
            
            // 调用DeepSeek AI进行代码评审
            String aiResponse = deepSeekService.reviewCode(codeContent, language);
            
            if (aiResponse != null) {
                // 解析AI返回的JSON
                JsonNode jsonNode = objectMapper.readTree(aiResponse);
                
                review.setCodeQualityScore(getIntValue(jsonNode, "qualityScore", 70));
                review.setDocumentationScore(getIntValue(jsonNode, "documentationScore", 70));
                review.setCompletenessScore(getIntValue(jsonNode, "completenessScore", 70));
                review.setStandardizationScore(getIntValue(jsonNode, "standardizationScore", 70));
                review.setTotalScore(getIntValue(jsonNode, "totalScore", 70));
                review.setFeedback(getStringValue(jsonNode, "feedback", "AI评审完成"));
                review.setSuggestions(listToString(parseStringArray(jsonNode, "suggestions")));
                review.setIssuesFound(listToString(parseStringArray(jsonNode, "issues")));
                
                log.info("DeepSeek AI代码评审完成，总分: {}", review.getTotalScore());
            } else {
                // AI调用失败，使用本地规则作为降级方案
                log.warn("AI评审失败，使用本地规则降级");
                reviewWithLocalRules(review, codeContent);
            }
            
        } catch (IOException e) {
            log.error("读取代码文件失败", e);
            review.setTotalScore(0);
            review.setFeedback("无法读取代码文件");
        } catch (Exception e) {
            log.error("AI评审解析失败", e);
            reviewWithLocalRules(review, "");
        }
        
        return review;
    }
    
    /**
     * 使用本地规则降级评审
     */
    private void reviewWithLocalRules(AiReview review, String code) {
        int score = 70; // 默认分数
        
        if (code != null && !code.isEmpty()) {
            // 简单的规则检查
            if (code.contains("//") || code.contains("/*")) {
                score += 10; // 有注释加分
            }
            if (code.length() > 500) {
                score += 10; // 有一定代码量加分
            }
            if (code.contains("public class") || code.contains("function")) {
                score += 5; // 有类或函数定义
            }
        }
        
        review.setCodeQualityScore(score);
        review.setDocumentationScore(score - 5);
        review.setCompletenessScore(score);
        review.setStandardizationScore(score - 5);
        review.setTotalScore(score);
        review.setFeedback("本地规则评审完成（AI服务不可用）");
        review.setSuggestions("建议添加更多注释, 建议优化代码结构");
        review.setIssuesFound("");
    }
    
    /**
     * 检测编程语言
     */
    private String detectLanguage(String fileName) {
        if (fileName == null) return "unknown";
        
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".java")) return "Java";
        if (lower.endsWith(".py")) return "Python";
        if (lower.endsWith(".js")) return "JavaScript";
        if (lower.endsWith(".ts")) return "TypeScript";
        if (lower.endsWith(".html")) return "HTML";
        if (lower.endsWith(".css")) return "CSS";
        if (lower.endsWith(".c") || lower.endsWith(".cpp")) return "C/C++";
        if (lower.endsWith(".go")) return "Go";
        if (lower.endsWith(".rs")) return "Rust";
        if (lower.endsWith(".sql")) return "SQL";
        
        return "unknown";
    }
    
    /**
     * 安全获取Int值
     */
    private int getIntValue(JsonNode node, String field, int defaultValue) {
        if (node.has(field) && node.get(field).isInt()) {
            return node.get(field).asInt();
        }
        return defaultValue;
    }
    
    /**
     * 安全获取String值
     */
    private String getStringValue(JsonNode node, String field, String defaultValue) {
        if (node.has(field) && node.get(field).isTextual()) {
            return node.get(field).asText();
        }
        return defaultValue;
    }
    
    /**
     * 解析字符串数组
     */
    private List<String> parseStringArray(JsonNode node, String field) {
        List<String> result = new ArrayList<>();
        if (node.has(field) && node.get(field).isArray()) {
            for (JsonNode item : node.get(field)) {
                if (item.isTextual()) {
                    result.add(item.asText());
                }
            }
        }
        return result;
    }
    
    /**
     * 将List<String>转换为逗号分隔的字符串
     */
    private String listToString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "";
        }
        return String.join(", ", list);
    }
    
    /**
     * 评审文档 - 使用DeepSeek AI
     */
    private AiReview reviewDocument(TrainingMaterial material) {
        AiReview review = new AiReview();
        review.setMaterial(material);
        review.setReviewType(ReviewType.DOCUMENT_ANALYSIS);
        
        try {
            // 读取文档内容
            Path filePath = Paths.get(uploadDir, material.getFilePath());
            String documentContent = Files.readString(filePath);
            
            // 确定文档类型
            String documentType = detectDocumentType(material.getFileName());
            
            // 调用DeepSeek AI进行文档评审
            String aiResponse = deepSeekService.reviewDocument(documentContent, documentType);
            
            if (aiResponse != null) {
                // 解析AI返回的JSON
                JsonNode jsonNode = objectMapper.readTree(aiResponse);
                
                review.setCodeQualityScore(getIntValue(jsonNode, "contentScore", 70));
                review.setDocumentationScore(getIntValue(jsonNode, "structureScore", 70));
                review.setCompletenessScore(getIntValue(jsonNode, "completenessScore", 70));
                review.setStandardizationScore(getIntValue(jsonNode, "formatScore", 70));
                review.setTotalScore(getIntValue(jsonNode, "totalScore", 70));
                review.setFeedback(getStringValue(jsonNode, "feedback", "AI评审完成"));
                review.setSuggestions(listToString(parseStringArray(jsonNode, "suggestions")));
                review.setIssuesFound(listToString(parseStringArray(jsonNode, "issues")));
                
                log.info("DeepSeek AI文档评审完成，总分: {}", review.getTotalScore());
            } else {
                // AI调用失败，使用本地规则作为降级方案
                log.warn("AI评审失败，使用本地规则降级");
                reviewDocumentWithLocalRules(review, documentContent);
            }
            
        } catch (IOException e) {
            log.error("读取文档文件失败", e);
            review.setTotalScore(0);
            review.setFeedback("无法读取文档文件");
        } catch (Exception e) {
            log.error("AI评审解析失败", e);
            reviewDocumentWithLocalRules(review, "");
        }
        
        return review;
    }
    
    /**
     * 使用本地规则降级评审文档
     */
    private void reviewDocumentWithLocalRules(AiReview review, String content) {
        int score = 70; // 默认分数
        
        if (content != null && !content.isEmpty()) {
            // 简单的规则检查
            if (content.length() > 1000) {
                score += 10; // 有一定内容量加分
            }
            if (content.contains("。") || content.contains(".")) {
                score += 5; // 有完整句子
            }
            if (content.contains("\n\n")) {
                score += 5; // 有段落分隔
            }
        }
        
        review.setCodeQualityScore(score);
        review.setDocumentationScore(score - 5);
        review.setCompletenessScore(score);
        review.setStandardizationScore(score - 5);
        review.setTotalScore(score);
        review.setFeedback("本地规则评审完成（AI服务不可用）");
        review.setSuggestions("建议优化文档结构, 建议补充更多细节");
        review.setIssuesFound("");
    }
    
    /**
     * 检测文档类型
     */
    private String detectDocumentType(String fileName) {
        if (fileName == null) return "unknown";
        
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".md")) return "Markdown文档";
        if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "Word文档";
        if (lower.endsWith(".pdf")) return "PDF文档";
        if (lower.endsWith(".txt")) return "纯文本";
        if (lower.endsWith(".html")) return "HTML文档";
        
        return "文档";
    }
    
    /**
     * 分析代码质量
     */
    private int analyzeCodeQuality(String code) {
        int score = 100;
        
        // 检查代码行数
        String[] lines = code.split("\n");
        if (lines.length > 1000) {
            score -= 10;
        }
        
        // 检查是否有注释
        boolean hasComments = false;
        for (String line : lines) {
            if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
                hasComments = true;
                break;
            }
        }
        if (!hasComments) {
            score -= 20;
        }
        
        // 检查代码复杂度（简化检查）
        if (code.contains("if (") && code.contains("else if (") && code.contains("else if (")) {
            score -= 15;
        }
        
        // 检查是否有空行
        long emptyLines = 0;
        for (String line : lines) {
            if (line.trim().isEmpty()) {
                emptyLines++;
            }
        }
        if (emptyLines > lines.length * 0.3) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析代码文档
     */
    private int analyzeCodeDocumentation(String code) {
        int score = 100;
        
        // 检查是否有文件头注释
        if (!code.contains("/**") && !code.contains("/*")) {
            score -= 30;
        }
        
        // 检查是否有函数注释
        if (code.contains("public ") && !code.contains("@param") && !code.contains("@return")) {
            score -= 20;
        }
        
        // 检查是否有变量注释
        if (code.contains("private ") && !code.contains("// ")) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析代码完整性
     */
    private int analyzeCodeCompleteness(String code) {
        int score = 100;
        
        // 检查是否有main函数或入口点
        if (!code.contains("public static void main") && !code.contains("@SpringBootApplication")) {
            score -= 20;
        }
        
        // 检查是否有异常处理
        if (!code.contains("try") && !code.contains("catch")) {
            score -= 15;
        }
        
        // 检查是否有日志记录
        if (!code.contains("log.") && !code.contains("Logger") && !code.contains("System.out")) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析代码规范性
     */
    private int analyzeCodeStandardization(String code) {
        int score = 100;
        
        // 检查命名规范
        if (code.contains("int a") || code.contains("int b") || code.contains("int c")) {
            score -= 15;
        }
        
        // 检查是否有魔法数字
        if (code.contains("= 100;") || code.contains("= 1000;") || code.contains("= 999;")) {
            score -= 10;
        }
        
        // 检查代码格式
        if (code.contains("if(") || code.contains("for(") || code.contains("while(")) {
            score -= 5;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析文档内容
     */
    private int analyzeDocumentContent(String content) {
        int score = 100;
        
        // 检查文档长度
        if (content.length() < 500) {
            score -= 30;
        }
        
        // 检查是否有标题
        if (!content.contains("#") && !content.contains("标题")) {
            score -= 20;
        }
        
        // 检查是否有列表
        if (!content.contains("- ") && !content.contains("* ") && !content.contains("1.")) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析文档结构
     */
    private int analyzeDocumentStructure(String content) {
        int score = 100;
        
        // 检查是否有目录结构
        if (!content.contains("目录") && !content.contains("TOC")) {
            score -= 15;
        }
        
        // 检查是否有章节
        if (!content.contains("##") && !content.contains("第") && !content.contains("章")) {
            score -= 20;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析文档完整性
     */
    private int analyzeDocumentCompleteness(String content) {
        int score = 100;
        
        // 检查是否有引言
        if (!content.contains("引言") && !content.contains("简介") && !content.contains("概述")) {
            score -= 15;
        }
        
        // 检查是否有结论
        if (!content.contains("结论") && !content.contains("总结") && !content.contains("小结")) {
            score -= 15;
        }
        
        // 检查是否有参考文献
        if (!content.contains("参考文献") && !content.contains("参考资料") && !content.contains("参考")) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 分析文档格式
     */
    private int analyzeDocumentFormat(String content) {
        int score = 100;
        
        // 检查是否有图片描述
        if (content.contains("图") && !content.contains("![") && !content.contains("图片")) {
            score -= 10;
        }
        
        // 检查是否有表格
        if (content.contains("表") && !content.contains("|") && !content.contains("表格")) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 生成代码反馈
     */
    private String generateCodeFeedback(int codeQuality, int documentation, int completeness, int standardization) {
        StringBuilder feedback = new StringBuilder();
        feedback.append("代码评审结果:\n");
        feedback.append("1. 代码质量: ").append(codeQuality).append("/100\n");
        feedback.append("2. 文档注释: ").append(documentation).append("/100\n");
        feedback.append("3. 代码完整性: ").append(completeness).append("/100\n");
        feedback.append("4. 代码规范性: ").append(standardization).append("/100\n");
        
        if (codeQuality < 60) {
            feedback.append("\n建议: 代码质量需要改进，请检查代码逻辑和结构。");
        }
        if (documentation < 60) {
            feedback.append("\n建议: 文档注释不足，请添加必要的注释说明。");
        }
        if (completeness < 60) {
            feedback.append("\n建议: 代码完整性不足，请添加异常处理和日志记录。");
        }
        if (standardization < 60) {
            feedback.append("\n建议: 代码规范性需要改进，请遵循命名规范。");
        }
        
        return feedback.toString();
    }
    
    /**
     * 生成代码建议
     */
    private String generateCodeSuggestions(String code) {
        StringBuilder suggestions = new StringBuilder();
        suggestions.append("改进建议:\n");
        
        if (!code.contains("/**")) {
            suggestions.append("1. 添加文件头注释，说明文件用途和作者信息\n");
        }
        if (!code.contains("@param")) {
            suggestions.append("2. 为公共方法添加参数和返回值注释\n");
        }
        if (code.contains("if (") && code.contains("else if (")) {
            suggestions.append("3. 考虑使用策略模式减少条件分支\n");
        }
        if (code.contains("new ") && code.contains("Exception")) {
            suggestions.append("4. 考虑使用自定义异常类\n");
        }
        
        return suggestions.toString();
    }
    
    /**
     * 查找代码问题
     */
    private String findCodeIssues(String code) {
        StringBuilder issues = new StringBuilder();
        issues.append("发现的问题:\n");
        
        if (code.contains("int a") || code.contains("int b")) {
            issues.append("1. 使用了无意义的变量名\n");
        }
        if (code.contains("= 100;") || code.contains("= 1000;")) {
            issues.append("2. 存在魔法数字，建议定义为常量\n");
        }
        if (code.contains("System.out.println")) {
            issues.append("3. 使用了System.out.println，建议使用日志框架\n");
        }
        
        return issues.toString();
    }
    
    /**
     * 生成文档反馈
     */
    private String generateDocumentFeedback(int content, int structure, int completeness, int format) {
        StringBuilder feedback = new StringBuilder();
        feedback.append("文档评审结果:\n");
        feedback.append("1. 内容质量: ").append(content).append("/100\n");
        feedback.append("2. 结构清晰度: ").append(structure).append("/100\n");
        feedback.append("3. 内容完整性: ").append(completeness).append("/100\n");
        feedback.append("4. 格式规范性: ").append(format).append("/100\n");
        
        if (content < 60) {
            feedback.append("\n建议: 文档内容需要充实，增加详细说明。");
        }
        if (structure < 60) {
            feedback.append("\n建议: 文档结构需要优化，添加目录和章节划分。");
        }
        if (completeness < 60) {
            feedback.append("\n建议: 文档完整性不足，添加引言和结论部分。");
        }
        if (format < 60) {
            feedback.append("\n建议: 文档格式需要规范，添加图表说明。");
        }
        
        return feedback.toString();
    }
    
    /**
     * 生成文档建议
     */
    private String generateDocumentSuggestions(String content) {
        StringBuilder suggestions = new StringBuilder();
        suggestions.append("改进建议:\n");
        
        if (!content.contains("目录")) {
            suggestions.append("1. 添加目录结构，方便阅读\n");
        }
        if (!content.contains("引言") && !content.contains("简介")) {
            suggestions.append("2. 添加引言部分，说明文档背景和目的\n");
        }
        if (!content.contains("结论") && !content.contains("总结")) {
            suggestions.append("3. 添加结论部分，总结主要内容\n");
        }
        if (!content.contains("参考")) {
            suggestions.append("4. 添加参考文献或参考资料\n");
        }
        
        return suggestions.toString();
    }
    
    /**
     * 查找文档问题
     */
    private String findDocumentIssues(String content) {
        StringBuilder issues = new StringBuilder();
        issues.append("发现的问题:\n");
        
        if (content.length() < 500) {
            issues.append("1. 文档内容过短，建议补充详细说明\n");
        }
        if (!content.contains("#") && !content.contains("标题")) {
            issues.append("2. 缺少标题，建议添加各级标题\n");
        }
        if (!content.contains("- ") && !content.contains("1.")) {
            issues.append("3. 缺少列表，建议使用列表提高可读性\n");
        }
        
        return issues.toString();
    }
    
    /**
     * 使用自定义评审标准评审材料
     */
    @Async
    @Transactional
    public void reviewMaterialWithCriteria(Long materialId, Long criteriaId) {
        log.info("开始使用自定义评审标准评审材料: {}, 标准ID: {}", materialId, criteriaId);
        
        TrainingMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new RuntimeException("材料不存在"));
        
        ReviewCriteriaResponse criteria = reviewCriteriaService.getCriteriaById(criteriaId);
        
        // 更新状态为AI评审中
        material.setStatus(MaterialStatus.AI_REVIEWING);
        materialRepository.save(material);
        
        long startTime = System.currentTimeMillis();
        
        try {
            // 根据材料类型进行评审
            AiReview review;
            if (material.getMaterialType() == TrainingMaterial.MaterialType.CODE) {
                review = reviewCodeWithCriteria(material, criteria);
            } else {
                review = reviewDocumentWithCriteria(material, criteria);
            }
            
            // 保存评审结果
            AiReview savedReview = aiReviewRepository.save(review);
            
            // 更新材料的AI评分
            material.setAiScore(savedReview.getTotalScore());
            material.setAiFeedback(savedReview.getFeedback());
            material.setStatus(MaterialStatus.AI_REVIEWED);
            materialRepository.save(material);
            
            long duration = System.currentTimeMillis() - startTime;
            log.info("材料 {} 使用自定义标准评审完成，耗时: {}ms，评分: {}", materialId, duration, savedReview.getTotalScore());
            
        } catch (Exception e) {
            log.error("AI评审失败", e);
            material.setStatus(MaterialStatus.SUBMITTED);
            materialRepository.save(material);
        }
    }
    
    /**
     * 使用自定义评审标准评审代码
     */
    private AiReview reviewCodeWithCriteria(TrainingMaterial material, ReviewCriteriaResponse criteria) {
        AiReview review = new AiReview();
        review.setMaterial(material);
        review.setReviewType(ReviewType.CODE_ANALYSIS);
        
        try {
            // 读取代码文件
            Path filePath = Paths.get(uploadDir, material.getFilePath());
            String codeContent = Files.readString(filePath);
            
            // 确定编程语言
            String language = detectLanguage(material.getFileName());
            
            // 构建评审标准描述
            String criteriaDescription = buildCriteriaDescription(criteria);
            
            // 调用DeepSeek AI进行代码评审
            String aiResponse = deepSeekService.reviewCodeWithCriteria(codeContent, language, criteriaDescription);
            
            if (aiResponse != null) {
                // 解析AI返回的JSON
                JsonNode jsonNode = objectMapper.readTree(aiResponse);
                
                // 根据自定义标准解析评审结果
                parseReviewResultFromCriteria(review, jsonNode, criteria);
                
                log.info("DeepSeek AI代码评审完成（使用自定义标准），总分: {}", review.getTotalScore());
            } else {
                // AI调用失败，使用本地规则作为降级方案
                log.warn("AI评审失败，使用本地规则降级");
                reviewWithLocalRules(review, codeContent);
            }
            
        } catch (IOException e) {
            log.error("读取代码文件失败", e);
            review.setTotalScore(0);
            review.setFeedback("无法读取代码文件");
        } catch (Exception e) {
            log.error("AI评审解析失败", e);
            reviewWithLocalRules(review, "");
        }
        
        return review;
    }
    
    /**
     * 使用自定义评审标准评审文档
     */
    private AiReview reviewDocumentWithCriteria(TrainingMaterial material, ReviewCriteriaResponse criteria) {
        AiReview review = new AiReview();
        review.setMaterial(material);
        review.setReviewType(ReviewType.DOCUMENT_ANALYSIS);
        
        try {
            // 读取文档内容
            Path filePath = Paths.get(uploadDir, material.getFilePath());
            String documentContent = Files.readString(filePath);
            
            // 确定文档类型
            String documentType = detectDocumentType(material.getFileName());
            
            // 构建评审标准描述
            String criteriaDescription = buildCriteriaDescription(criteria);
            
            // 调用DeepSeek AI进行文档评审
            String aiResponse = deepSeekService.reviewDocumentWithCriteria(documentContent, documentType, criteriaDescription);
            
            if (aiResponse != null) {
                // 解析AI返回的JSON
                JsonNode jsonNode = objectMapper.readTree(aiResponse);
                
                // 根据自定义标准解析评审结果
                parseReviewResultFromCriteria(review, jsonNode, criteria);
                
                log.info("DeepSeek AI文档评审完成（使用自定义标准），总分: {}", review.getTotalScore());
            } else {
                // AI调用失败，使用本地规则作为降级方案
                log.warn("AI评审失败，使用本地规则降级");
                reviewDocumentWithLocalRules(review, documentContent);
            }
            
        } catch (IOException e) {
            log.error("读取文档文件失败", e);
            review.setTotalScore(0);
            review.setFeedback("无法读取文档文件");
        } catch (Exception e) {
            log.error("AI评审解析失败", e);
            reviewDocumentWithLocalRules(review, "");
        }
        
        return review;
    }
    
    /**
     * 构建评审标准描述
     */
    private String buildCriteriaDescription(ReviewCriteriaResponse criteria) {
        StringBuilder description = new StringBuilder();
        description.append("评审标准: ").append(criteria.getName()).append("\n");
        description.append("标准描述: ").append(criteria.getDescription()).append("\n");
        description.append("难度级别: ").append(criteria.getDifficultyLevelDescription()).append("\n");
        description.append("标准类型: ").append(criteria.getCriteriaTypeDescription()).append("\n\n");
        
        description.append("评审维度:\n");
        if (criteria.getDimensions() != null) {
            for (ReviewDimensionResponse dimension : criteria.getDimensions()) {
                description.append("- ").append(dimension.getName())
                        .append(" (权重: ").append(dimension.getWeight()).append("%")
                        .append(", 最高分: ").append(dimension.getMaxScore()).append(")\n");
                description.append("  评分标准: ").append(dimension.getScoringCriteria()).append("\n");
            }
        }
        
        return description.toString();
    }
    
    /**
     * 根据自定义标准解析评审结果
     */
    private void parseReviewResultFromCriteria(AiReview review, JsonNode jsonNode, ReviewCriteriaResponse criteria) {
        // 解析总分
        review.setTotalScore(getIntValue(jsonNode, "totalScore", 70));
        review.setFeedback(getStringValue(jsonNode, "feedback", "AI评审完成"));
        review.setSuggestions(listToString(parseStringArray(jsonNode, "suggestions")));
        review.setIssuesFound(listToString(parseStringArray(jsonNode, "issues")));
        
        // 根据自定义标准解析各维度分数
        if (criteria.getDimensions() != null && !criteria.getDimensions().isEmpty()) {
            List<ReviewDimensionResponse> dimensions = criteria.getDimensions();
            
            // 尝试从AI响应中获取各维度分数
            if (dimensions.size() >= 1) {
                review.setCodeQualityScore(getIntValue(jsonNode, "dimension1Score", 70));
            }
            if (dimensions.size() >= 2) {
                review.setDocumentationScore(getIntValue(jsonNode, "dimension2Score", 70));
            }
            if (dimensions.size() >= 3) {
                review.setCompletenessScore(getIntValue(jsonNode, "dimension3Score", 70));
            }
            if (dimensions.size() >= 4) {
                review.setStandardizationScore(getIntValue(jsonNode, "dimension4Score", 70));
            }
        } else {
            // 使用默认解析
            review.setCodeQualityScore(getIntValue(jsonNode, "qualityScore", 70));
            review.setDocumentationScore(getIntValue(jsonNode, "documentationScore", 70));
            review.setCompletenessScore(getIntValue(jsonNode, "completenessScore", 70));
            review.setStandardizationScore(getIntValue(jsonNode, "standardizationScore", 70));
        }
    }
    
    /**
     * 获取材料的AI评审记录
     */
    public List<AiReviewResponse> getMaterialReviews(Long materialId) {
        List<AiReview> reviews = aiReviewRepository.findByMaterialId(materialId);
        return reviews.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取用户的平均AI评分
     */
    public Double getUserAverageScore(Long userId) {
        return aiReviewRepository.averageScoreByUserId(userId);
    }
    
    /**
     * 转换为响应DTO
     */
    private AiReviewResponse convertToResponse(AiReview review) {
        AiReviewResponse response = new AiReviewResponse();
        response.setId(review.getId());
        response.setMaterialId(review.getMaterial().getId());
        response.setMaterialTitle(review.getMaterial().getTitle());
        response.setReviewType(review.getReviewType().name());
        response.setReviewTypeDescription(review.getReviewType().getDescription());
        response.setTotalScore(review.getTotalScore());
        response.setCodeQualityScore(review.getCodeQualityScore());
        response.setDocumentationScore(review.getDocumentationScore());
        response.setCompletenessScore(review.getCompletenessScore());
        response.setStandardizationScore(review.getStandardizationScore());
        response.setFeedback(review.getFeedback());
        response.setSuggestions(review.getSuggestions());
        response.setIssuesFound(review.getIssuesFound());
        response.setReviewDurationMs(review.getReviewDurationMs());
        response.setModelVersion(review.getModelVersion());
        response.setCreatedAt(review.getCreatedAt());
        return response;
    }
}
