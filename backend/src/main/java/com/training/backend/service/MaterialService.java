package com.training.backend.service;

import com.training.backend.dto.MaterialSubmitRequest;
import com.training.backend.dto.MaterialResponse;
import com.training.backend.dto.ReviewCriteriaResponse;
import com.training.backend.entity.TrainingMaterial;
import com.training.backend.entity.TrainingMaterial.MaterialType;
import com.training.backend.entity.TrainingMaterial.MaterialStatus;
import com.training.backend.entity.User;
import com.training.backend.entity.Task;
import com.training.backend.repository.TrainingMaterialRepository;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 实训材料服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialService {
    
    private final TrainingMaterialRepository materialRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final AiReviewService aiReviewService;
    private final ReviewCriteriaService reviewCriteriaService;
    
    @Value("${file.upload-dir}")
    private String uploadDir;
    
    /**
     * 提交实训材料
     */
    @Transactional
    public MaterialResponse submitMaterial(MaterialSubmitRequest request, MultipartFile file, Long userId) {
        // 验证用户
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        // 验证任务
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new RuntimeException("任务不存在"));
        
        // 保存文件
        String fileName = saveFile(file);
        
        // 创建材料实体
        TrainingMaterial material = new TrainingMaterial();
        material.setTitle(request.getTitle());
        material.setDescription(request.getDescription());
        material.setMaterialType(MaterialType.valueOf(request.getMaterialType()));
        material.setFileName(file.getOriginalFilename());
        material.setFilePath(fileName);
        material.setFileSize(file.getSize());
        material.setFileType(file.getContentType());
        material.setSubmittedBy(user);
        material.setTask(task);
        material.setVersion(request.getVersion());
        material.setStatus(MaterialStatus.SUBMITTED);
        
        TrainingMaterial savedMaterial = materialRepository.save(material);
        log.info("用户 {} 提交了材料: {}", userId, savedMaterial.getTitle());
        
        // 异步触发AI评审
        triggerAiReview(savedMaterial);
        
        return convertToResponse(savedMaterial);
    }
    
    /**
     * 获取用户的材料列表
     */
    public List<MaterialResponse> getUserMaterials(Long userId) {
        List<TrainingMaterial> materials = materialRepository.findBySubmittedById(userId);
        return materials.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取任务的材料列表
     */
    public List<MaterialResponse> getTaskMaterials(Long taskId) {
        List<TrainingMaterial> materials = materialRepository.findByTaskId(taskId);
        return materials.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取材料详情
     */
    public MaterialResponse getMaterial(Long materialId) {
        TrainingMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new RuntimeException("材料不存在"));
        return convertToResponse(material);
    }
    
    /**
     * 更新材料状态
     */
    @Transactional
    public MaterialResponse updateMaterialStatus(Long materialId, MaterialStatus status, Long reviewerId, String comment) {
        TrainingMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new RuntimeException("材料不存在"));
        
        material.setStatus(status);
        material.setReviewedBy(reviewerId);
        material.setReviewedAt(java.time.LocalDateTime.now());
        material.setReviewComment(comment);
        
        TrainingMaterial updatedMaterial = materialRepository.save(material);
        log.info("材料 {} 状态更新为: {}", materialId, status);
        
        return convertToResponse(updatedMaterial);
    }
    
    /**
     * 保存文件到本地
     */
    private String saveFile(MultipartFile file) {
        try {
            // 创建上传目录
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // 生成唯一文件名
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + extension;
            
            // 保存文件
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            log.info("文件保存成功: {}", filePath);
            return uniqueFilename;
        } catch (IOException e) {
            log.error("文件保存失败", e);
            throw new RuntimeException("文件保存失败: " + e.getMessage());
        }
    }
    
    /**
     * 触发AI评审
     */
    private void triggerAiReview(TrainingMaterial material) {
        try {
            // 尝试找到适合的评审标准
            Long criteriaId = findSuitableCriteria(material);
            
            if (criteriaId != null) {
                // 使用自定义评审标准
                aiReviewService.reviewMaterialWithCriteria(material.getId(), criteriaId);
            } else {
                // 使用默认评审标准
                aiReviewService.reviewMaterial(material.getId());
            }
        } catch (Exception e) {
            log.error("AI评审触发失败", e);
        }
    }
    
    /**
     * 找到适合材料的评审标准
     */
    private Long findSuitableCriteria(TrainingMaterial material) {
        try {
            // 首先尝试根据任务查找评审标准
            if (material.getTask() != null) {
                List<ReviewCriteriaResponse> taskCriteria = reviewCriteriaService.getCriteriaByTask(material.getTask().getId());
                if (!taskCriteria.isEmpty()) {
                    return taskCriteria.get(0).getId();
                }
                
                // 如果任务没有关联评审标准，尝试根据项目查找
                if (material.getTask().getProject() != null) {
                    List<ReviewCriteriaResponse> projectCriteria = reviewCriteriaService.getCriteriaByProject(material.getTask().getProject().getId());
                    if (!projectCriteria.isEmpty()) {
                        return projectCriteria.get(0).getId();
                    }
                }
            }
            
            // 如果都没有，尝试查找全局评审标准
            List<ReviewCriteriaResponse> globalCriteria = reviewCriteriaService.getGlobalCriteria();
            if (!globalCriteria.isEmpty()) {
                // 根据材料类型选择合适的全局标准
                for (ReviewCriteriaResponse criteria : globalCriteria) {
                    if (material.getMaterialType() == MaterialType.CODE && "CODE".equals(criteria.getCriteriaType())) {
                        return criteria.getId();
                    } else if ((material.getMaterialType() == MaterialType.REQUIREMENT_DOC || 
                            material.getMaterialType() == MaterialType.DESIGN_DOC || 
                            material.getMaterialType() == MaterialType.TEST_DOC) && 
                            "DOCUMENT".equals(criteria.getCriteriaType())) {
                        return criteria.getId();
                    }
                }
                
                // 如果没有匹配类型的全局标准，返回第一个全局标准
                return globalCriteria.get(0).getId();
            }
        } catch (Exception e) {
            log.warn("查找评审标准失败，使用默认标准", e);
        }
        
        return null;
    }
    
    /**
     * 转换为响应DTO
     */
    private MaterialResponse convertToResponse(TrainingMaterial material) {
        MaterialResponse response = new MaterialResponse();
        response.setId(material.getId());
        response.setTitle(material.getTitle());
        response.setDescription(material.getDescription());
        response.setMaterialType(material.getMaterialType().name());
        response.setMaterialTypeDescription(material.getMaterialType().getDescription());
        response.setFileName(material.getFileName());
        response.setFileType(material.getFileType());
        response.setFileSize(material.getFileSize());
        response.setVersion(material.getVersion());
        response.setStatus(material.getStatus().name());
        response.setStatusDescription(material.getStatus().getDescription());
        
        if (material.getSubmittedBy() != null) {
            response.setSubmittedById(material.getSubmittedBy().getId());
            response.setSubmittedByName(material.getSubmittedBy().getName());
        }
        
        if (material.getTask() != null) {
            response.setTaskId(material.getTask().getId());
            response.setTaskTitle(material.getTask().getTitle());
        }
        
        response.setAiScore(material.getAiScore());
        response.setAiFeedback(material.getAiFeedback());
        response.setReviewedBy(material.getReviewedBy());
        response.setReviewedAt(material.getReviewedAt());
        response.setReviewComment(material.getReviewComment());
        response.setCreatedAt(material.getCreatedAt());
        response.setUpdatedAt(material.getUpdatedAt());
        
        return response;
    }
}
