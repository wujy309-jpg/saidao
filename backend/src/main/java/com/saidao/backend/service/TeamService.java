package com.saidao.backend.service;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 团队服务：创建/招募/申请审批/成员管理
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {
    
    private final TeamRepository teamRepository;
    private final TeamMemberRepository memberRepository;
    private final TeamApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final CodeRepositoryRepository repoRepository;
    
    @Transactional
    public Team createTeam(Long leaderId, Team team) {
        User leader = userRepository.findById(leaderId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        team.setLeader(leader);
        team.setMemberCount(1);
        Team saved = teamRepository.save(team);
        
        TeamMember member = new TeamMember();
        member.setTeam(saved);
        member.setUser(leader);
        member.setRole(TeamMember.TeamRole.LEADER);
        memberRepository.save(member);
        
        log.info("团队创建成功: {}", saved.getName());
        return saved;
    }
    
    public List<Team> listTeams(Boolean recruiting, String keyword) {
        List<Team> teams;
        if (keyword != null && !keyword.isBlank()) {
            teams = teamRepository.findByNameContainingIgnoreCase(keyword.trim());
        } else if (Boolean.TRUE.equals(recruiting)) {
            teams = teamRepository.findByRecruitingTrueOrderByCreatedAtDesc();
        } else {
            teams = teamRepository.findAll();
        }
        return teams.stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
    }
    
    public List<Team> myTeams(Long userId) {
        return memberRepository.findByUserId(userId).stream()
                .map(TeamMember::getTeam)
                .collect(Collectors.toList());
    }
    
    public Team getTeam(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("团队不存在"));
    }
    
    public List<TeamMember> getMembers(Long teamId) {
        return memberRepository.findByTeamId(teamId);
    }
    
    public boolean isLeader(Long teamId, Long userId) {
        return memberRepository.findByTeamIdAndUserId(teamId, userId)
                .map(m -> m.getRole() == TeamMember.TeamRole.LEADER)
                .orElse(false);
    }
    
    public boolean isMember(Long teamId, Long userId) {
        return memberRepository.existsByTeamIdAndUserId(teamId, userId);
    }
    
    @Transactional
    public Team updateTeam(Long teamId, Team updates) {
        Team team = getTeam(teamId);
        if (updates.getName() != null) team.setName(updates.getName());
        if (updates.getSlogan() != null) team.setSlogan(updates.getSlogan());
        if (updates.getDescription() != null) team.setDescription(updates.getDescription());
        if (updates.getRecruiting() != null) team.setRecruiting(updates.getRecruiting());
        if (updates.getSizeLimit() != null) team.setSizeLimit(updates.getSizeLimit());
        if (updates.getTargetCompetition() != null) team.setTargetCompetition(updates.getTargetCompetition());
        return teamRepository.save(team);
    }
    
    @Transactional
    public void deleteTeam(Long teamId) {
        applicationRepository.deleteByTeamId(teamId);
        memberRepository.deleteByTeamId(teamId);
        // 解除项目空间关联
        repoRepository.findByTeamId(teamId).forEach(r -> {
            r.setTeamId(null);
            repoRepository.save(r);
        });
        teamRepository.deleteById(teamId);
        log.info("团队已解散: {}", teamId);
    }
    
    // ============ 申请与审批 ============
    
    @Transactional
    public TeamApplication apply(Long teamId, Long userId, String message) {
        Team team = getTeam(teamId);
        if (!Boolean.TRUE.equals(team.getRecruiting())) {
            throw new RuntimeException("该团队当前未开启招募");
        }
        if (memberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new RuntimeException("你已是该团队成员");
        }
        if (memberRepository.countByTeamId(teamId) >= team.getSizeLimit()) {
            throw new RuntimeException("该团队人数已满");
        }
        if (applicationRepository.findByTeamIdAndUserIdAndStatus(teamId, userId,
                TeamApplication.ApplicationStatus.PENDING).isPresent()) {
            throw new RuntimeException("你已提交过申请，等待队长审批");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        TeamApplication app = new TeamApplication();
        app.setTeam(team);
        app.setUser(user);
        app.setMessage(message);
        return applicationRepository.save(app);
    }
    
    public List<TeamApplication> getApplications(Long teamId) {
        return applicationRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
    }
    
    public List<TeamApplication> myApplications(Long userId) {
        return applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    @Transactional
    public TeamApplication review(Long teamId, Long applicationId, boolean approve) {
        TeamApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("申请不存在"));
        if (!app.getTeam().getId().equals(teamId)) {
            throw new RuntimeException("申请与团队不匹配");
        }
        if (approve) {
            if (memberRepository.countByTeamId(teamId) >= app.getTeam().getSizeLimit()) {
                throw new RuntimeException("团队人数已满，无法通过");
            }
            app.setStatus(TeamApplication.ApplicationStatus.APPROVED);
            TeamMember member = new TeamMember();
            member.setTeam(app.getTeam());
            member.setUser(app.getUser());
            member.setRole(TeamMember.TeamRole.MEMBER);
            memberRepository.save(member);
            Team team = app.getTeam();
            team.setMemberCount((int) memberRepository.countByTeamId(teamId));
            teamRepository.save(team);
        } else {
            app.setStatus(TeamApplication.ApplicationStatus.REJECTED);
        }
        return applicationRepository.save(app);
    }
    
    @Transactional
    public void removeMember(Long teamId, Long userId) {
        memberRepository.deleteByTeamIdAndUserId(teamId, userId);
        Team team = getTeam(teamId);
        team.setMemberCount((int) memberRepository.countByTeamId(teamId));
        teamRepository.save(team);
    }
    
    @Transactional
    public void leave(Long teamId, Long userId) {
        if (isLeader(teamId, userId)) {
            throw new RuntimeException("队长不能直接退出，请先解散团队或转让队长");
        }
        removeMember(teamId, userId);
    }
    
    /** 团队详情附加信息 */
    public Map<String, Object> detail(Long teamId, Long currentUserId) {
        Team team = getTeam(teamId);
        List<TeamMember> members = memberRepository.findByTeamId(teamId);
        var repos = repoRepository.findByTeamId(teamId);
        boolean isMember = currentUserId != null && memberRepository.existsByTeamIdAndUserId(teamId, currentUserId);
        boolean isLeader = currentUserId != null && isLeader(teamId, currentUserId);
        boolean pending = currentUserId != null && applicationRepository
                .findByTeamIdAndUserIdAndStatus(teamId, currentUserId, TeamApplication.ApplicationStatus.PENDING)
                .isPresent();
        return Map.of(
                "team", team,
                "members", members,
                "repos", repos,
                "isMember", isMember,
                "isLeader", isLeader,
                "hasPendingApplication", pending
        );
    }
}
