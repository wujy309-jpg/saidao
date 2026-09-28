package com.training.backend.service;

import com.training.backend.dto.SaveProfileRequest;
import com.training.backend.entity.UserProfile;
import com.training.backend.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * 用户画像服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {
    
    private final UserProfileRepository profileRepository;
    
    public UserProfile get(Long userId) {
        return profileRepository.findByUserId(userId).orElse(null);
    }
    
    @Transactional
    public UserProfile save(Long userId, SaveProfileRequest request) {
        UserProfile profile = profileRepository.findByUserId(userId).orElseGet(UserProfile::new);
        profile.setUserId(userId);
        profile.setDiscipline(request.getDiscipline());
        profile.setMajor(request.getMajor());
        profile.setGrade(request.getGrade());
        profile.setInterests(request.getInterests());
        profile.setSkills(request.getSkills());
        profile.setGoals(request.getGoals());
        profile.setWeeklyHours(request.getWeeklyHours());
        profile.setHasExperience(request.getHasExperience());
        profile.setPreferredLevel(request.getPreferredLevel());
        profile.setDescription(request.getDescription());
        if (request.getSchool() != null) profile.setSchool(request.getSchool());
        if (request.getAchievements() != null) profile.setAchievements(request.getAchievements());
        return profileRepository.save(profile);
    }
    
    /** 批量查询用户身份信息(学校/履历/认证),用于社区作者卡片 */
    public Map<Long, Map<String, Object>> batchIdentity(List<Long> userIds) {
        Map<Long, Map<String, Object>> result = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) return result;
        for (Long uid : new HashSet<>(userIds)) {
            profileRepository.findByUserId(uid).ifPresent(p -> {
                Map<String, Object> m = new HashMap<>();
                m.put("school", p.getSchool());
                m.put("achievements", p.getAchievements());
                m.put("verified", Boolean.TRUE.equals(p.getVerified()));
                result.put(uid, m);
            });
        }
        return result;
    }
    
    /** 管理员切换认证状态 */
    @Transactional
    public boolean toggleVerified(Long userId) {
        UserProfile profile = profileRepository.findByUserId(userId).orElseGet(UserProfile::new);
        profile.setUserId(userId);
        profile.setVerified(!Boolean.TRUE.equals(profile.getVerified()));
        profileRepository.save(profile);
        return Boolean.TRUE.equals(profile.getVerified());
    }
}
