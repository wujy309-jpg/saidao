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
    private final ForumPostRepository forumPostRepository;
    private final NotificationRepository notificationRepository;
    private final AuditService auditService;
    
    @Transactional
    public Team createTeam(Long leaderId, Team team) {
        if (team == null || team.getName() == null || team.getName().isBlank()) {
            throw new IllegalArgumentException("团队名称不能为空");
        }
        if (team.getName().trim().length() > 100) {
            throw new IllegalArgumentException("团队名称不能超过100个字符");
        }
        User leader = userRepository.findById(leaderId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        team.setId(null);
        team.setLeader(leader);
        team.setMemberCount(1);
        if (team.getSizeLimit() == null) team.setSizeLimit(5);
        if (team.getSizeLimit() < 2 || team.getSizeLimit() > 50) {
            throw new IllegalArgumentException("团队人数上限应在2到50之间");
        }
        Team saved = teamRepository.save(team);
        
        TeamMember member = new TeamMember();
        member.setTeam(saved);
        member.setUser(leader);
        member.setRole(TeamMember.TeamRole.LEADER);
        memberRepository.save(member);
        audit(userRepository, leaderId, "CREATE", "TEAM", saved.getId(), "创建团队");
        
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
        if (updates.getSizeLimit() != null) {
            int currentMemberCount = team.getMemberCount() == null
                    ? (int) memberRepository.countByTeamId(teamId) : team.getMemberCount();
            if (updates.getSizeLimit() < currentMemberCount || updates.getSizeLimit() < 2 || updates.getSizeLimit() > 50) {
                throw new IllegalArgumentException("人数上限不能小于当前成员数，且应在2到50之间");
            }
            team.setSizeLimit(updates.getSizeLimit());
        }
        if (updates.getTargetCompetition() != null) team.setTargetCompetition(updates.getTargetCompetition());
        return teamRepository.save(team);
    }
    
    @Transactional
    public void deleteTeam(Long teamId) {
        Team team = getTeam(teamId);
        List<Long> memberIds = memberRepository.findByTeamId(teamId).stream()
                .map(m -> m.getUser().getId()).toList();
        // team_id is a weak reference for recruitment posts: preserve the post and detach it.
        forumPostRepository.findAll().stream()
                .filter(p -> teamId.equals(p.getTeamId()))
                .forEach(post -> {
                    post.setTeamId(null);
                    forumPostRepository.save(post);
                });
        memberIds.forEach(userId -> notifyUser(userId, Notification.NotificationType.TEAM_DISBANDED,
                null, teamId, "团队「" + team.getName() + "」已解散"));
        applicationRepository.deleteByTeamId(teamId);
        memberRepository.deleteByTeamId(teamId);
        // 解除项目空间关联
        repoRepository.findByTeamId(teamId).forEach(r -> {
            r.setTeamId(null);
            repoRepository.save(r);
        });
        teamRepository.delete(team);
        audit(userRepository, team.getLeader().getId(), "DELETE", "TEAM", teamId, "解散团队");
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
        TeamApplication saved = applicationRepository.save(app);
        notifyUser(team.getLeader().getId(), Notification.NotificationType.TEAM_APPLY,
                userId, teamId, "收到来自「" + user.getName() + "」的新入队申请");
        return saved;
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
        if (app.getStatus() != TeamApplication.ApplicationStatus.PENDING) {
            throw new IllegalStateException("该申请已经处理，不能重复审批");
        }
        if (approve) {
            if (memberRepository.countByTeamId(teamId) >= app.getTeam().getSizeLimit()) {
                throw new RuntimeException("团队人数已满，无法通过");
            }
            if (memberRepository.existsByTeamIdAndUserId(teamId, app.getUser().getId())) {
                throw new IllegalStateException("该用户已经是团队成员");
            }
            app.setStatus(TeamApplication.ApplicationStatus.APPROVED);
            TeamMember member = new TeamMember();
            member.setTeam(app.getTeam());
            member.setUser(app.getUser());
            member.setRole(TeamMember.TeamRole.MEMBER);
            memberRepository.save(member);
            Team team = app.getTeam();
            team.setMemberCount((int) memberRepository.countByTeamId(teamId));
            if (team.getMemberCount() >= team.getSizeLimit()) team.setRecruiting(false);
            teamRepository.save(team);
            notifyUser(app.getUser().getId(), Notification.NotificationType.TEAM_APPROVED,
                    team.getLeader().getId(), teamId, "你已加入团队「" + team.getName() + "」");
        } else {
            app.setStatus(TeamApplication.ApplicationStatus.REJECTED);
            notifyUser(app.getUser().getId(), Notification.NotificationType.TEAM_REJECTED,
                    app.getTeam().getLeader().getId(), teamId, "团队「" + app.getTeam().getName() + "」拒绝了你的申请");
        }
        return applicationRepository.save(app);
    }
    
    @Transactional
    public void removeMember(Long teamId, Long userId) {
        removeMember(teamId, userId, userId);
    }

    @Transactional
    public void removeMember(Long teamId, Long userId, Long actorId) {
        TeamMember member = memberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new RuntimeException("成员不存在"));
        if (member.getRole() == TeamMember.TeamRole.LEADER) {
            throw new IllegalStateException("队长不能被移除，请先转让队长或解散团队");
        }
        memberRepository.deleteByTeamIdAndUserId(teamId, userId);
        Team team = getTeam(teamId);
        team.setMemberCount((int) memberRepository.countByTeamId(teamId));
        if (team.getMemberCount() < team.getSizeLimit() && Boolean.FALSE.equals(team.getRecruiting())) {
            team.setRecruiting(true);
        }
        teamRepository.save(team);
        notifyUser(userId, Notification.NotificationType.TEAM_REMOVED,
                team.getLeader().getId(), teamId, "你已被移出团队「" + team.getName() + "」");
        audit(userRepository, actorId, "DELETE", "TEAM_MEMBER", teamId, "移除用户" + userId);
    }
    
    @Transactional
    public void leave(Long teamId, Long userId) {
        if (!isMember(teamId, userId)) throw new RuntimeException("你不是该团队成员");
        if (isLeader(teamId, userId)) {
            throw new RuntimeException("队长不能直接退出，请先解散团队或转让队长");
        }
        removeMember(teamId, userId, userId);
    }

    @Transactional
    public Team transferLeadership(Long teamId, Long currentLeaderId, Long newLeaderId) {
        Team team = getTeam(teamId);
        if (!isLeader(teamId, currentLeaderId)) throw new org.springframework.security.access.AccessDeniedException("只有队长可以转让队长");
        TeamMember current = memberRepository.findByTeamIdAndUserId(teamId, currentLeaderId)
                .orElseThrow(() -> new RuntimeException("当前队长成员记录不存在"));
        TeamMember next = memberRepository.findByTeamIdAndUserId(teamId, newLeaderId)
                .orElseThrow(() -> new IllegalArgumentException("新队长必须是现有团队成员"));
        if (currentLeaderId.equals(newLeaderId)) throw new IllegalArgumentException("新队长不能是当前队长");
        current.setRole(TeamMember.TeamRole.MEMBER);
        next.setRole(TeamMember.TeamRole.LEADER);
        memberRepository.save(current);
        memberRepository.save(next);
        User newLeader = next.getUser();
        team.setLeader(newLeader);
        Team saved = teamRepository.save(team);
        audit(userRepository, currentLeaderId, "UPDATE", "TEAM", teamId, "转让队长给用户" + newLeaderId);
        notifyUser(currentLeaderId, Notification.NotificationType.TEAM_TRANSFER,
                newLeaderId, teamId, "你已将团队「" + team.getName() + "」的队长转让给" + newLeader.getName());
        notifyUser(newLeaderId, Notification.NotificationType.TEAM_TRANSFER,
                currentLeaderId, teamId, "你已成为团队「" + team.getName() + "」的新队长");
        return saved;
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

    private void notifyUser(Long userId, Notification.NotificationType type, Long actorId,
                            Long teamId, String summary) {
        if (userId == null) return;
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setActorId(actorId);
        notification.setTeamId(teamId);
        notification.setSummary(summary == null ? null : summary.substring(0, Math.min(120, summary.length())));
        notification.setRead(false);
        notificationRepository.save(notification);
    }

    private void audit(UserRepository users, Long userId, String action, String resourceType,
                       Long resourceId, String details) {
        users.findById(userId).ifPresent(user -> auditService.logAction(userId, user.getUsername(),
                action, resourceType, resourceId, details, true, null));
    }
}
