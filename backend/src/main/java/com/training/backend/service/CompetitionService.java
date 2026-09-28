package com.training.backend.service;

import com.training.backend.dto.CompetitionRequest;
import com.training.backend.entity.Competition;
import com.training.backend.entity.CompetitionFeedback;
import com.training.backend.entity.ExcellentWork;
import com.training.backend.entity.Favorite;
import com.training.backend.repository.CompetitionFeedbackRepository;
import com.training.backend.repository.CompetitionRepository;
import com.training.backend.repository.ExcellentWorkRepository;
import com.training.backend.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 竞赛库服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitionService {
    
    private final CompetitionRepository competitionRepository;
    private final FavoriteRepository favoriteRepository;
    private final CompetitionFeedbackRepository feedbackRepository;
    private final ExcellentWorkRepository excellentWorkRepository;
    
    /** 列表 + 筛选 + 搜索 */
    public List<Competition> list(String category, String level, String format, String keyword,
                                  String catalogList, Boolean baoyanBonus) {
        List<Competition> all = competitionRepository.findAll().stream()
                .filter(c -> c.getStatus() == Competition.CompetitionStatus.ACTIVE)
                .collect(Collectors.toList());
        
        if (category != null && !category.isBlank()) {
            all = all.stream().filter(c -> c.getCategory().name().equalsIgnoreCase(category)).collect(Collectors.toList());
        }
        if (level != null && !level.isBlank()) {
            all = all.stream().filter(c -> c.getLevel().name().equalsIgnoreCase(level)).collect(Collectors.toList());
        }
        if (format != null && !format.isBlank()) {
            all = all.stream().filter(c -> c.getFormat().name().equalsIgnoreCase(format)).collect(Collectors.toList());
        }
        if (catalogList != null && !catalogList.isBlank()) {
            all = all.stream().filter(c -> Objects.equals(c.getCatalogList(), catalogList)).collect(Collectors.toList());
        }
        if (Boolean.TRUE.equals(baoyanBonus)) {
            all = all.stream().filter(c -> Boolean.TRUE.equals(c.getBaoyanBonus())).collect(Collectors.toList());
        }
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            all = all.stream().filter(c ->
                    (c.getName() != null && c.getName().toLowerCase().contains(kw)) ||
                    (c.getTags() != null && c.getTags().stream().anyMatch(t -> t.toLowerCase().contains(kw))) ||
                    (c.getDisciplines() != null && c.getDisciplines().stream().anyMatch(d -> d.toLowerCase().contains(kw)))
            ).collect(Collectors.toList());
        }
        
        return all.stream()
                .sorted(Comparator.comparing(Competition::getPrestige, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Competition::getId))
                .collect(Collectors.toList());
    }
    
    public Competition get(Long id) {
        return competitionRepository.findById(id).orElse(null);
    }
    
    /** 管理端：全部（含已结束） */
    public List<Competition> listAllForAdmin() {
        return competitionRepository.findAll().stream()
                .sorted(Comparator.comparing(Competition::getId))
                .collect(Collectors.toList());
    }
    
    @Transactional
    public Competition create(CompetitionRequest request) {
        Competition c = new Competition();
        applyRequest(c, request);
        return competitionRepository.save(c);
    }
    
    @Transactional
    public Competition update(Long id, CompetitionRequest request) {
        Competition c = competitionRepository.findById(id).orElse(null);
        if (c == null) return null;
        applyRequest(c, request);
        return competitionRepository.save(c);
    }
    
    @Transactional
    public boolean delete(Long id) {
        if (!competitionRepository.existsById(id)) return false;
        competitionRepository.deleteById(id);
        favoriteRepository.deleteByCompetitionId(id);
        return true;
    }
    
    private void applyRequest(Competition c, CompetitionRequest r) {
        c.setName(r.getName());
        c.setCategory(r.getCategory());
        c.setDisciplines(r.getDisciplines());
        c.setLevel(r.getLevel());
        c.setOrganizer(r.getOrganizer());
        c.setRegistrationStart(r.getRegistrationStart());
        c.setRegistrationEnd(r.getRegistrationEnd());
        c.setCompetitionDate(r.getCompetitionDate());
        c.setFormat(r.getFormat());
        c.setTeamSizeMax(r.getTeamSizeMax());
        c.setDifficulty(r.getDifficulty());
        c.setPrestige(r.getPrestige());
        c.setSuitableGrades(r.getSuitableGrades());
        c.setTags(r.getTags());
        c.setDescription(r.getDescription());
        c.setOfficialUrl(r.getOfficialUrl());
        c.setCatalogList(r.getCatalogList());
        c.setBaoyanBonus(r.getBaoyanBonus());
        c.setEntryFee(r.getEntryFee());
        if (r.getRules() != null) c.setRules(r.getRules());
        if (r.getStatus() != null) c.setStatus(r.getStatus());
    }
    
    // ============ 我的竞赛（收藏 + 参赛状态） ============
    
    @Transactional
    public boolean toggleFavorite(Long userId, Long competitionId) {
        if (favoriteRepository.existsByUserIdAndCompetitionId(userId, competitionId)) {
            favoriteRepository.deleteByUserIdAndCompetitionId(userId, competitionId);
            return false;
        }
        Favorite f = new Favorite();
        f.setUserId(userId);
        f.setCompetitionId(competitionId);
        f.setStatus(Favorite.JourneyStatus.WATCHING);
        favoriteRepository.save(f);
        return true;
    }
    
    /** 更新参赛状态（不存在则创建记录） */
    @Transactional
    public Favorite updateStatus(Long userId, Long competitionId, Favorite.JourneyStatus status) {
        Favorite f = favoriteRepository.findByUserIdAndCompetitionId(userId, competitionId)
                .orElseGet(() -> {
                    Favorite nf = new Favorite();
                    nf.setUserId(userId);
                    nf.setCompetitionId(competitionId);
                    return nf;
                });
        f.setStatus(status);
        return favoriteRepository.save(f);
    }
    
    public List<Map<String, Object>> getMyCompetitions(Long userId) {
        List<Favorite> favs = favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return favs.stream()
                .map(f -> {
                    Competition c = competitionRepository.findById(f.getCompetitionId()).orElse(null);
                    if (c == null) return null;
                    Map<String, Object> item = new HashMap<>();
                    item.put("competition", c);
                    item.put("status", f.getStatus().name());
                    item.put("updatedAt", f.getUpdatedAt());
                    return item;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
    
    public Favorite getFavorite(Long userId, Long competitionId) {
        return favoriteRepository.findByUserIdAndCompetitionId(userId, competitionId).orElse(null);
    }
    
    public boolean isFavorited(Long userId, Long competitionId) {
        return favoriteRepository.existsByUserIdAndCompetitionId(userId, competitionId);
    }
    
    // ============ 行为反馈（推荐闭环） ============
    
    @Transactional
    public CompetitionFeedback setFeedback(Long userId, Long competitionId, CompetitionFeedback.FeedbackAction action) {
        CompetitionFeedback feedback = feedbackRepository
                .findByUserIdAndCompetitionId(userId, competitionId)
                .orElseGet(() -> {
                    CompetitionFeedback nf = new CompetitionFeedback();
                    nf.setUserId(userId);
                    nf.setCompetitionId(competitionId);
                    return nf;
                });
        feedback.setAction(action);
        return feedbackRepository.save(feedback);
    }
    
    @Transactional
    public boolean removeFeedback(Long userId, Long competitionId) {
        CompetitionFeedback feedback = feedbackRepository
                .findByUserIdAndCompetitionId(userId, competitionId).orElse(null);
        if (feedback == null) return false;
        feedbackRepository.delete(feedback);
        return true;
    }
    
    public CompetitionFeedback getFeedback(Long userId, Long competitionId) {
        return feedbackRepository.findByUserIdAndCompetitionId(userId, competitionId).orElse(null);
    }
    
    // ============ 历年优秀作品 ============
    
    public List<ExcellentWork> getExcellentWorks(Long competitionId) {
        return excellentWorkRepository.findByCompetitionIdOrderBySortOrderAscYearDesc(competitionId);
    }
    
    // ============ 相似竞赛推荐（规则评分） ============
    
    /**
     * 相似竞赛：类别相同 40 + 标签重叠 15/个（上限30）+ 难度接近 20 + 级别接近 10
     */
    public List<Competition> similar(Long competitionId, int limit) {
        Competition target = competitionRepository.findById(competitionId).orElse(null);
        if (target == null) return List.of();
        
        Set<String> targetTags = target.getTags() == null ? Set.of() : new HashSet<>(target.getTags());
        
        return competitionRepository.findAll().stream()
                .filter(c -> c.getStatus() == Competition.CompetitionStatus.ACTIVE)
                .filter(c -> !c.getId().equals(competitionId))
                .map(c -> Map.entry(c, similarScore(target, targetTags, c)))
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .filter(e -> e.getValue() > 20)
                .limit(limit)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }
    
    private int similarScore(Competition target, Set<String> targetTags, Competition c) {
        int score = 0;
        if (target.getCategory() != null && target.getCategory() == c.getCategory()) score += 40;
        if (c.getTags() != null) {
            long overlap = c.getTags().stream().filter(targetTags::contains).count();
            score += Math.min(30, (int) overlap * 15);
        }
        if (target.getDifficulty() != null && c.getDifficulty() != null) {
            int diff = Math.abs(target.getDifficulty() - c.getDifficulty());
            score += diff == 0 ? 20 : diff == 1 ? 10 : 0;
        }
        if (target.getLevel() != null && target.getLevel() == c.getLevel()) score += 10;
        return score;
    }
}
