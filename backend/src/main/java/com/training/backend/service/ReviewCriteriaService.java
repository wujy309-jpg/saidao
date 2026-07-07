package com.training.backend.service;

import com.training.backend.dto.*;
import com.training.backend.entity.*;
import com.training.backend.entity.ReviewCriteria.CriteriaType;
import com.training.backend.entity.ReviewCriteria.DifficultyLevel;
import com.training.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 评审标准服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewCriteriaService {
    
    private final ReviewCriteriaRepository criteriaRepository;
    private final ReviewDimensionRepository dimensionRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    
    /**
     * 创建评审标准
     */
    @Transactional
    public ReviewCriteriaResponse createCriteria(CreateCriteriaRequest request) {
        log.info("创建评审标准: {}", request.getName());
        
        ReviewCriteria criteria = new ReviewCriteria();
        criteria.setName(request.getName());
        criteria.setDescription(request.getDescription());
        criteria.setDifficultyLevel(DifficultyLevel.valueOf(request.getDifficultyLevel()));
        criteria.setCriteriaType(CriteriaType.valueOf(request.getCriteriaType()));
        
        // 设置关联项目
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            criteria.setProject(project);
        }
        
        // 设置关联任务
        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                    .orElseThrow(() -> new RuntimeException("任务不存在"));
            criteria.setTask(task);
        }
        
        // 保存评审标准
        ReviewCriteria savedCriteria = criteriaRepository.save(criteria);
        
        // 保存评审维度
        if (request.getDimensions() != null && !request.getDimensions().isEmpty()) {
            List<ReviewDimension> dimensions = new ArrayList<>();
            for (CreateDimensionRequest dimRequest : request.getDimensions()) {
                ReviewDimension dimension = new ReviewDimension();
                dimension.setCriteria(savedCriteria);
                dimension.setName(dimRequest.getName());
                dimension.setWeight(dimRequest.getWeight());
                dimension.setMaxScore(dimRequest.getMaxScore());
                dimension.setScoringCriteria(dimRequest.getScoringCriteria());
                dimension.setOrder(dimRequest.getOrder());
                dimensions.add(dimension);
            }
            dimensionRepository.saveAll(dimensions);
            savedCriteria.setDimensions(dimensions);
        }
        
        return convertToResponse(savedCriteria);
    }
    
    /**
     * 获取所有评审标准
     */
    public List<ReviewCriteriaResponse> getAllCriteria() {
        List<ReviewCriteria> criteria = criteriaRepository.findAll();
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据ID获取评审标准
     */
    public ReviewCriteriaResponse getCriteriaById(Long id) {
        ReviewCriteria criteria = criteriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("评审标准不存在"));
        return convertToResponse(criteria);
    }
    
    /**
     * 更新评审标准
     */
    @Transactional
    public ReviewCriteriaResponse updateCriteria(Long id, UpdateCriteriaRequest request) {
        log.info("更新评审标准: {}", id);
        
        ReviewCriteria criteria = criteriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("评审标准不存在"));
        
        // 更新基本信息
        if (request.getName() != null) {
            criteria.setName(request.getName());
        }
        if (request.getDescription() != null) {
            criteria.setDescription(request.getDescription());
        }
        if (request.getDifficultyLevel() != null) {
            criteria.setDifficultyLevel(DifficultyLevel.valueOf(request.getDifficultyLevel()));
        }
        if (request.getCriteriaType() != null) {
            criteria.setCriteriaType(CriteriaType.valueOf(request.getCriteriaType()));
        }
        
        // 更新关联项目
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            criteria.setProject(project);
        }
        
        // 更新关联任务
        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                    .orElseThrow(() -> new RuntimeException("任务不存在"));
            criteria.setTask(task);
        }
        
        // 更新评审维度
        if (request.getDimensions() != null) {
            // 删除现有维度
            dimensionRepository.deleteByCriteriaId(id);
            
            // 添加新维度
            List<ReviewDimension> dimensions = new ArrayList<>();
            for (UpdateDimensionRequest dimRequest : request.getDimensions()) {
                ReviewDimension dimension = new ReviewDimension();
                dimension.setCriteria(criteria);
                dimension.setName(dimRequest.getName());
                dimension.setWeight(dimRequest.getWeight());
                dimension.setMaxScore(dimRequest.getMaxScore());
                dimension.setScoringCriteria(dimRequest.getScoringCriteria());
                dimension.setOrder(dimRequest.getOrder());
                dimensions.add(dimension);
            }
            dimensionRepository.saveAll(dimensions);
            criteria.setDimensions(dimensions);
        }
        
        ReviewCriteria updatedCriteria = criteriaRepository.save(criteria);
        return convertToResponse(updatedCriteria);
    }
    
    /**
     * 删除评审标准
     */
    @Transactional
    public void deleteCriteria(Long id) {
        log.info("删除评审标准: {}", id);
        
        ReviewCriteria criteria = criteriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("评审标准不存在"));
        
        // 删除关联维度
        dimensionRepository.deleteByCriteriaId(id);
        
        // 删除评审标准
        criteriaRepository.delete(criteria);
    }
    
    /**
     * 根据项目ID获取评审标准
     */
    public List<ReviewCriteriaResponse> getCriteriaByProject(Long projectId) {
        List<ReviewCriteria> criteria = criteriaRepository.findByProjectId(projectId);
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据任务ID获取评审标准
     */
    public List<ReviewCriteriaResponse> getCriteriaByTask(Long taskId) {
        List<ReviewCriteria> criteria = criteriaRepository.findByTaskId(taskId);
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据难度级别获取评审标准
     */
    public List<ReviewCriteriaResponse> getCriteriaByDifficultyLevel(String difficultyLevel) {
        DifficultyLevel level = DifficultyLevel.valueOf(difficultyLevel);
        List<ReviewCriteria> criteria = criteriaRepository.findByDifficultyLevel(level);
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据标准类型获取评审标准
     */
    public List<ReviewCriteriaResponse> getCriteriaByType(String criteriaType) {
        CriteriaType type = CriteriaType.valueOf(criteriaType);
        List<ReviewCriteria> criteria = criteriaRepository.findByCriteriaType(type);
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 搜索评审标准
     */
    public List<ReviewCriteriaResponse> searchCriteria(String keyword) {
        List<ReviewCriteria> criteria = criteriaRepository.searchByKeyword(keyword);
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取全局评审标准（未关联项目和任务）
     */
    public List<ReviewCriteriaResponse> getGlobalCriteria() {
        List<ReviewCriteria> criteria = criteriaRepository.findGlobalCriteria();
        return criteria.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取适合材料的评审标准
     * 根据材料所属任务和项目，自动推荐合适的评审标准
     */
    public List<ReviewCriteriaResponse> getCriteriaForMaterial(Long materialId) {
        // 这里需要根据材料ID获取材料信息，然后根据材料类型和关联任务/项目推荐评审标准
        // 简化实现：返回全局评审标准
        return getGlobalCriteria();
    }
    
    /**
     * 转换为响应DTO
     */
    private ReviewCriteriaResponse convertToResponse(ReviewCriteria criteria) {
        ReviewCriteriaResponse response = new ReviewCriteriaResponse();
        response.setId(criteria.getId());
        response.setName(criteria.getName());
        response.setDescription(criteria.getDescription());
        response.setDifficultyLevel(criteria.getDifficultyLevel().name());
        response.setDifficultyLevelDescription(criteria.getDifficultyLevel().getDescription());
        response.setCriteriaType(criteria.getCriteriaType().name());
        response.setCriteriaTypeDescription(criteria.getCriteriaType().getDescription());
        response.setCreatedAt(criteria.getCreatedAt());
        response.setUpdatedAt(criteria.getUpdatedAt());
        
        // 设置关联项目信息
        if (criteria.getProject() != null) {
            response.setProjectId(criteria.getProject().getId());
            response.setProjectName(criteria.getProject().getName());
        }
        
        // 设置关联任务信息
        if (criteria.getTask() != null) {
            response.setTaskId(criteria.getTask().getId());
            response.setTaskTitle(criteria.getTask().getTitle());
        }
        
        // 设置评审维度
        if (criteria.getDimensions() != null) {
            List<ReviewDimensionResponse> dimensionResponses = criteria.getDimensions().stream()
                    .map(this::convertDimensionToResponse)
                    .collect(Collectors.toList());
            response.setDimensions(dimensionResponses);
        }
        
        return response;
    }
    
    /**
     * 转换评审维度为响应DTO
     */
    private ReviewDimensionResponse convertDimensionToResponse(ReviewDimension dimension) {
        ReviewDimensionResponse response = new ReviewDimensionResponse();
        response.setId(dimension.getId());
        response.setName(dimension.getName());
        response.setWeight(dimension.getWeight());
        response.setMaxScore(dimension.getMaxScore());
        response.setScoringCriteria(dimension.getScoringCriteria());
        response.setOrder(dimension.getOrder());
        return response;
    }
}