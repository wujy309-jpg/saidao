package com.training.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.training.backend.dto.*;
import com.training.backend.entity.*;
import com.training.backend.entity.LearningPath.PathStatus;
import com.training.backend.entity.LearningStep.StepStatus;
import com.training.backend.entity.LearningStep.StepType;
import com.training.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 学习路径服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningPathService {
    
    private final LearningPathRepository learningPathRepository;
    private final LearningStepRepository learningStepRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final DeepSeekService deepSeekService;
    private final ObjectMapper objectMapper;
    
    /**
     * 创建学习路径
     */
    @Transactional
    public LearningPathResponse createLearningPath(CreateLearningPathRequest request) {
        log.info("创建学习路径: {}", request.getPathName());
        
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("学生不存在"));
        
        LearningPath learningPath = new LearningPath();
        learningPath.setStudent(student);
        learningPath.setPathName(request.getPathName());
        learningPath.setDescription(request.getDescription());
        learningPath.setEstimatedDuration(request.getEstimatedDuration());
        
        // 设置关联项目
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            learningPath.setProject(project);
        }
        
        // 保存学习路径
        LearningPath savedPath = learningPathRepository.save(learningPath);
        
        // 保存学习步骤
        if (request.getSteps() != null && !request.getSteps().isEmpty()) {
            List<LearningStep> steps = new ArrayList<>();
            for (CreateLearningStepRequest stepRequest : request.getSteps()) {
                LearningStep step = new LearningStep();
                step.setLearningPath(savedPath);
                step.setTitle(stepRequest.getTitle());
                step.setDescription(stepRequest.getDescription());
                step.setStepType(StepType.valueOf(stepRequest.getStepType()));
                step.setOrder(stepRequest.getOrder());
                step.setEstimatedHours(stepRequest.getEstimatedHours());
                step.setResources(stepRequest.getResources());
                steps.add(step);
            }
            learningStepRepository.saveAll(steps);
            savedPath.setSteps(steps);
        }
        
        return convertToResponse(savedPath);
    }
    
    /**
     * 获取学生的所有学习路径
     */
    public List<LearningPathResponse> getLearningPathsByStudent(Long studentId) {
        List<LearningPath> paths = learningPathRepository.findByStudentId(studentId);
        return paths.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 获取学生指定状态的学习路径
     */
    public List<LearningPathResponse> getLearningPathsByStudentAndStatus(Long studentId, String status) {
        PathStatus pathStatus = PathStatus.valueOf(status);
        List<LearningPath> paths = learningPathRepository.findByStudentIdAndStatus(studentId, pathStatus);
        return paths.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 根据ID获取学习路径
     */
    public LearningPathResponse getLearningPathById(Long id) {
        LearningPath path = learningPathRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("学习路径不存在"));
        return convertToResponse(path);
    }
    
    /**
     * 更新学习路径状态
     */
    @Transactional
    public LearningPathResponse updateLearningPathStatus(Long id, String status) {
        log.info("更新学习路径状态: {} -> {}", id, status);
        
        LearningPath path = learningPathRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("学习路径不存在"));
        
        path.setStatus(PathStatus.valueOf(status));
        LearningPath updatedPath = learningPathRepository.save(path);
        
        return convertToResponse(updatedPath);
    }
    
    /**
     * 更新学习步骤状态
     */
    @Transactional
    public LearningStepResponse updateLearningStepStatus(Long stepId, String status) {
        log.info("更新学习步骤状态: {} -> {}", stepId, status);
        
        LearningStep step = learningStepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("学习步骤不存在"));
        
        step.setStatus(StepStatus.valueOf(status));
        
        // 如果步骤开始，设置开始时间
        if (StepStatus.IN_PROGRESS.name().equals(status) && step.getStartedAt() == null) {
            step.setStartedAt(java.time.LocalDateTime.now());
        }
        
        // 如果步骤完成，设置完成时间
        if (StepStatus.COMPLETED.name().equals(status) && step.getCompletedAt() == null) {
            step.setCompletedAt(java.time.LocalDateTime.now());
        }
        
        LearningStep updatedStep = learningStepRepository.save(step);
        
        // 检查是否所有步骤都已完成，如果是，更新学习路径状态
        checkAndUpdateLearningPathStatus(step.getLearningPath().getId());
        
        return convertStepToResponse(updatedStep);
    }
    
    /**
     * 检查并更新学习路径状态
     */
    private void checkAndUpdateLearningPathStatus(Long learningPathId) {
        LearningPath path = learningPathRepository.findById(learningPathId)
                .orElseThrow(() -> new RuntimeException("学习路径不存在"));
        
        long totalSteps = learningStepRepository.findByLearningPathId(learningPathId).size();
        long completedSteps = learningStepRepository.countCompletedByLearningPathId(learningPathId);
        
        if (totalSteps > 0 && totalSteps == completedSteps) {
            path.setStatus(PathStatus.COMPLETED);
            learningPathRepository.save(path);
        }
    }
    
    /**
     * 删除学习路径
     */
    @Transactional
    public void deleteLearningPath(Long id) {
        log.info("删除学习路径: {}", id);
        
        LearningPath path = learningPathRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("学习路径不存在"));
        
        // 删除关联的学习步骤
        learningStepRepository.deleteByLearningPathId(id);
        
        // 删除学习路径
        learningPathRepository.delete(path);
    }
    
    /**
     * 使用AI生成学习路径
     */
    @Transactional
    public LearningPathResponse generateLearningPathWithAI(GenerateLearningPathRequest request) {
        log.info("使用AI生成学习路径");
        
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new RuntimeException("学生不存在"));
        
        // 调用AI生成学习路径
        String aiResponse = deepSeekService.generateLearningPath(
                request.getStudentProfile(),
                request.getLearningGoal(),
                request.getCurrentLevel()
        );
        
        if (aiResponse == null) {
            throw new RuntimeException("AI生成学习路径失败");
        }
        
        try {
            // 解析AI返回的JSON
            JsonNode jsonNode = objectMapper.readTree(aiResponse);
            
            // 创建学习路径
            LearningPath learningPath = new LearningPath();
            learningPath.setStudent(student);
            learningPath.setPathName(jsonNode.has("pathName") ? jsonNode.get("pathName").asText() : "AI生成学习路径");
            learningPath.setDescription(jsonNode.has("description") ? jsonNode.get("description").asText() : "");
            learningPath.setEstimatedDuration(jsonNode.has("estimatedDuration") ? jsonNode.get("estimatedDuration").asInt() : 0);
            learningPath.setStatus(PathStatus.NOT_STARTED);
            
            // 设置关联项目
            if (request.getProjectId() != null) {
                Project project = projectRepository.findById(request.getProjectId())
                        .orElseThrow(() -> new RuntimeException("项目不存在"));
                learningPath.setProject(project);
            }
            
            // 保存学习路径
            LearningPath savedPath = learningPathRepository.save(learningPath);
            
            // 解析并保存学习步骤
            if (jsonNode.has("steps") && jsonNode.get("steps").isArray()) {
                List<LearningStep> steps = new ArrayList<>();
                int order = 0;
                
                for (JsonNode stepNode : jsonNode.get("steps")) {
                    LearningStep step = new LearningStep();
                    step.setLearningPath(savedPath);
                    step.setTitle(stepNode.has("title") ? stepNode.get("title").asText() : "学习步骤");
                    step.setDescription(stepNode.has("description") ? stepNode.get("description").asText() : "");
                    step.setStepType(stepNode.has("stepType") ? StepType.valueOf(stepNode.get("stepType").asText()) : StepType.LEARNING);
                    step.setOrder(order++);
                    step.setEstimatedHours(stepNode.has("estimatedHours") ? stepNode.get("estimatedHours").asInt() : 0);
                    
                    // 解析资源列表
                    if (stepNode.has("resources") && stepNode.get("resources").isArray()) {
                        List<String> resources = new ArrayList<>();
                        for (JsonNode resourceNode : stepNode.get("resources")) {
                            resources.add(resourceNode.asText());
                        }
                        step.setResources(String.join(",", resources));
                    }
                    
                    steps.add(step);
                }
                
                learningStepRepository.saveAll(steps);
                savedPath.setSteps(steps);
            }
            
            return convertToResponse(savedPath);
            
        } catch (Exception e) {
            log.error("解析AI生成的学习路径失败", e);
            throw new RuntimeException("解析AI生成的学习路径失败");
        }
    }
    
    /**
     * 获取学生的学习路径统计
     */
    public LearningPathStatistics getStudentStatistics(Long studentId) {
        LearningPathStatistics statistics = new LearningPathStatistics();
        
        List<LearningPath> allPaths = learningPathRepository.findByStudentId(studentId);
        statistics.setTotalPaths(allPaths.size());
        
        long completedPaths = allPaths.stream()
                .filter(p -> p.getStatus() == PathStatus.COMPLETED)
                .count();
        statistics.setCompletedPaths((int) completedPaths);
        
        long inProgressPaths = allPaths.stream()
                .filter(p -> p.getStatus() == PathStatus.IN_PROGRESS)
                .count();
        statistics.setInProgressPaths((int) inProgressPaths);
        
        // 计算平均完成时长
        double avgDuration = allPaths.stream()
                .filter(p -> p.getStatus() == PathStatus.COMPLETED && p.getActualDuration() != null)
                .mapToInt(LearningPath::getActualDuration)
                .average()
                .orElse(0);
        statistics.setAverageDuration((int) avgDuration);
        
        return statistics;
    }
    
    /**
     * 转换为响应DTO
     */
    private LearningPathResponse convertToResponse(LearningPath path) {
        LearningPathResponse response = new LearningPathResponse();
        response.setId(path.getId());
        response.setStudentId(path.getStudent().getId());
        response.setStudentName(path.getStudent().getName());
        response.setPathName(path.getPathName());
        response.setDescription(path.getDescription());
        response.setStatus(path.getStatus().name());
        response.setStatusDescription(path.getStatus().getDescription());
        response.setEstimatedDuration(path.getEstimatedDuration());
        response.setActualDuration(path.getActualDuration());
        response.setCreatedAt(path.getCreatedAt());
        response.setUpdatedAt(path.getUpdatedAt());
        
        // 设置关联项目信息
        if (path.getProject() != null) {
            response.setProjectId(path.getProject().getId());
            response.setProjectName(path.getProject().getName());
        }
        
        // 设置学习步骤
        if (path.getSteps() != null) {
            List<LearningStepResponse> stepResponses = path.getSteps().stream()
                    .map(this::convertStepToResponse)
                    .collect(Collectors.toList());
            response.setSteps(stepResponses);
            
            // 计算进度
            long completedSteps = path.getSteps().stream()
                    .filter(s -> s.getStatus() == StepStatus.COMPLETED)
                    .count();
            response.setCompletedSteps((int) completedSteps);
            response.setTotalSteps(path.getSteps().size());
            
            if (path.getSteps().size() > 0) {
                response.setProgress((double) completedSteps / path.getSteps().size() * 100);
            }
        }
        
        return response;
    }
    
    /**
     * 转换学习步骤为响应DTO
     */
    private LearningStepResponse convertStepToResponse(LearningStep step) {
        LearningStepResponse response = new LearningStepResponse();
        response.setId(step.getId());
        response.setLearningPathId(step.getLearningPath().getId());
        response.setTitle(step.getTitle());
        response.setDescription(step.getDescription());
        response.setStepType(step.getStepType().name());
        response.setStepTypeDescription(step.getStepType().getDescription());
        response.setOrder(step.getOrder());
        response.setStatus(step.getStatus().name());
        response.setStatusDescription(step.getStatus().getDescription());
        response.setEstimatedHours(step.getEstimatedHours());
        response.setActualHours(step.getActualHours());
        response.setResources(step.getResources());
        response.setStartedAt(step.getStartedAt());
        response.setCompletedAt(step.getCompletedAt());
        return response;
    }
    
    /**
     * 学习路径统计内部类
     */
    @lombok.Data
    public static class LearningPathStatistics {
        private int totalPaths;
        private int completedPaths;
        private int inProgressPaths;
        private int averageDuration;
    }
}