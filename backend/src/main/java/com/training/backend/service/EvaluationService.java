package com.training.backend.service;

import com.training.backend.entity.Evaluation;
import com.training.backend.entity.Evaluation.EvaluationType;
import com.training.backend.entity.User;
import com.training.backend.entity.Project;
import com.training.backend.entity.Task;
import com.training.backend.repository.EvaluationRepository;
import com.training.backend.repository.UserRepository;
import com.training.backend.repository.ProjectRepository;
import com.training.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 评价服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {
    
    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final NotificationService notificationService;
    
    /**
     * 创建评价
     */
    @Transactional
    public Evaluation createEvaluation(Evaluation evaluation, Long evaluatorId, Long evaluateeId, 
                                       Long projectId, Long taskId) {
        // 验证分数有效性
        if (!evaluation.isValidScore()) {
            throw new RuntimeException("评价分数必须在0-100之间");
        }
        
        User evaluator = userRepository.findById(evaluatorId)
                .orElseThrow(() -> new RuntimeException("评价人不存在"));
        
        User evaluatee = userRepository.findById(evaluateeId)
                .orElseThrow(() -> new RuntimeException("被评价人不存在"));
        
        // 验证不能自己评价自己
        if (evaluatorId.equals(evaluateeId)) {
            throw new RuntimeException("不能评价自己");
        }
        
        evaluation.setEvaluator(evaluator);
        evaluation.setEvaluatee(evaluatee);
        
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new RuntimeException("项目不存在"));
            evaluation.setProject(project);
        }
        
        if (taskId != null) {
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new RuntimeException("任务不存在"));
            evaluation.setTask(task);
        }
        
        // 计算综合得分
        evaluation.calculateTotalScore();
        
        Evaluation savedEvaluation = evaluationRepository.save(evaluation);
        
        // 发送通知
        notificationService.createNotification(
                evaluateeId,
                com.training.backend.entity.Notification.NotificationType.EVALUATION,
                "收到新评价",
                "您收到了一条来自" + evaluator.getName() + "的评价，得分：" + savedEvaluation.getTotalScore(),
                savedEvaluation.getId(),
                "EVALUATION"
        );
        
        log.info("评价创建成功: 评价人={}, 被评价人={}, 得分={}", 
                evaluator.getName(), evaluatee.getName(), savedEvaluation.getTotalScore());
        
        return savedEvaluation;
    }
    
    /**
     * 获取被评价人的所有评价
     */
    public List<Evaluation> getEvaluationsByEvaluatee(Long evaluateeId) {
        return evaluationRepository.findByEvaluateeId(evaluateeId);
    }
    
    /**
     * 获取被评价人在某项目的评价
     */
    public List<Evaluation> getEvaluationsByEvaluateeAndProject(Long evaluateeId, Long projectId) {
        return evaluationRepository.findByEvaluateeIdAndProjectId(evaluateeId, projectId);
    }
    
    /**
     * 获取项目的所有评价
     */
    public List<Evaluation> getEvaluationsByProject(Long projectId) {
        return evaluationRepository.findByProjectId(projectId);
    }
    
    /**
     * 获取用户的平均得分
     */
    public Double getAverageScore(Long evaluateeId) {
        return evaluationRepository.getAverageScoreByEvaluateeId(evaluateeId);
    }
    
    /**
     * 获取用户在某项目的平均得分
     */
    public Double getAverageScoreByProject(Long evaluateeId, Long projectId) {
        return evaluationRepository.getAverageScoreByEvaluateeIdAndProjectId(evaluateeId, projectId);
    }
    
    /**
     * 获取用户的维度平均分
     */
    public Map<String, Double> getDimensionAverages(Long evaluateeId) {
        List<Evaluation> evaluations = evaluationRepository.findByEvaluateeId(evaluateeId);
        
        if (evaluations.isEmpty()) {
            return new HashMap<>();
        }
        
        double techAvg = evaluations.stream()
                .filter(e -> e.getTechScore() != null)
                .mapToInt(Evaluation::getTechScore)
                .average().orElse(0);
        
        double teamworkAvg = evaluations.stream()
                .filter(e -> e.getTeamworkScore() != null)
                .mapToInt(Evaluation::getTeamworkScore)
                .average().orElse(0);
        
        double documentAvg = evaluations.stream()
                .filter(e -> e.getDocumentScore() != null)
                .mapToInt(Evaluation::getDocumentScore)
                .average().orElse(0);
        
        double innovationAvg = evaluations.stream()
                .filter(e -> e.getInnovationScore() != null)
                .mapToInt(Evaluation::getInnovationScore)
                .average().orElse(0);
        
        double attitudeAvg = evaluations.stream()
                .filter(e -> e.getAttitudeScore() != null)
                .mapToInt(Evaluation::getAttitudeScore)
                .average().orElse(0);
        
        Map<String, Double> averages = new HashMap<>();
        averages.put("tech", techAvg);
        averages.put("teamwork", teamworkAvg);
        averages.put("document", documentAvg);
        averages.put("innovation", innovationAvg);
        averages.put("attitude", attitudeAvg);
        
        return averages;
    }
    
    /**
     * 删除评价
     */
    @Transactional
    public void deleteEvaluation(Long evaluationId) {
        evaluationRepository.deleteById(evaluationId);
        log.info("评价已删除: {}", evaluationId);
    }
}
