package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.TeamDtos;
import com.saidao.backend.entity.Team;
import com.saidao.backend.entity.TeamMember;
import com.saidao.backend.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 团队接口
 */
@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
public class TeamController {
    
    private final TeamService teamService;
    
    /** 团队广场（可选只看招募中 + 关键词） */
    @GetMapping
    public ResponseEntity<ApiResponse<List<TeamDtos.TeamView>>> list(
            @RequestParam(required = false) Boolean recruiting,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(teamService.listTeams(recruiting, keyword).stream()
                .map(TeamDtos.TeamView::from).toList()));
    }
    
    /** 我的团队 */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<TeamDtos.TeamView>>> mine(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(teamService.myTeams(currentUserId(auth)).stream()
                .map(TeamDtos.TeamView::from).toList()));
    }
    
    /** 团队详情（成员+项目空间+我的状态） */
    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamDtos.DetailView>> detail(
            @PathVariable Long teamId, Authentication auth) {
        Map<String, Object> detail = teamService.detail(teamId, currentUserId(auth));
        @SuppressWarnings("unchecked")
        List<TeamMember> members = (List<TeamMember>) detail.get("members");
        @SuppressWarnings("unchecked")
        List<com.saidao.backend.entity.CodeRepository> repos = (List<com.saidao.backend.entity.CodeRepository>) detail.get("repos");
        TeamDtos.DetailView view = new TeamDtos.DetailView(
                TeamDtos.TeamView.from((Team) detail.get("team")),
                members.stream().map(TeamDtos.MemberView::from).toList(),
                repos.stream().map(TeamDtos.RepositoryView::from).toList(),
                Boolean.TRUE.equals(detail.get("isMember")),
                Boolean.TRUE.equals(detail.get("isLeader")),
                Boolean.TRUE.equals(detail.get("hasPendingApplication")));
        return ResponseEntity.ok(ApiResponse.success(view));
    }
    
    /** 创建团队（创建者自动成为队长） */
    @PostMapping
    public ResponseEntity<ApiResponse<TeamDtos.TeamView>> create(@RequestBody Team team, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("团队创建成功", TeamDtos.TeamView.from(teamService.createTeam(currentUserId(auth), team))));
    }
    
    /** 更新团队（队长） */
    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamDtos.TeamView>> update(
            @PathVariable Long teamId, @RequestBody Team team, Authentication auth) {
        requireLeader(teamId, auth);
        return ResponseEntity.ok(ApiResponse.success("团队已更新", TeamDtos.TeamView.from(teamService.updateTeam(teamId, team))));
    }
    
    /** 解散团队（队长） */
    @DeleteMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long teamId, Authentication auth) {
        requireLeader(teamId, auth);
        teamService.deleteTeam(teamId);
        return ResponseEntity.ok(ApiResponse.success("团队已解散", null));
    }
    
    /** 申请加入 */
    @PostMapping("/{teamId}/apply")
    public ResponseEntity<ApiResponse<TeamDtos.ApplicationView>> apply(
            @PathVariable Long teamId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String message = body == null ? null : body.get("message");
        return ResponseEntity.ok(ApiResponse.success("申请已提交", TeamDtos.ApplicationView.from(
                teamService.apply(teamId, currentUserId(auth), message))));
    }
    
    /** 我的申请记录 */
    @GetMapping("/applications/mine")
    public ResponseEntity<ApiResponse<List<TeamDtos.ApplicationView>>> myApplications(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(teamService.myApplications(currentUserId(auth)).stream()
                .map(TeamDtos.ApplicationView::from).toList()));
    }
    
    /** 团队收到的申请（队长） */
    @GetMapping("/{teamId}/applications")
    public ResponseEntity<ApiResponse<List<TeamDtos.ApplicationView>>> applications(
            @PathVariable Long teamId, Authentication auth) {
        requireLeader(teamId, auth);
        return ResponseEntity.ok(ApiResponse.success(teamService.getApplications(teamId).stream()
                .map(TeamDtos.ApplicationView::from).toList()));
    }
    
    /** 审批申请（队长）：body {approve: true/false} */
    @PostMapping("/{teamId}/applications/{applicationId}/review")
    public ResponseEntity<ApiResponse<TeamDtos.ApplicationView>> review(
            @PathVariable Long teamId,
            @PathVariable Long applicationId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        requireLeader(teamId, auth);
        boolean approve = Boolean.TRUE.equals(body.get("approve"));
        return ResponseEntity.ok(ApiResponse.success(
                approve ? "已通过，新成员加入团队" : "已拒绝",
                TeamDtos.ApplicationView.from(teamService.review(teamId, applicationId, approve))));
    }
    
    /** 移除成员（队长） */
    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long teamId, @PathVariable Long userId, Authentication auth) {
        requireLeader(teamId, auth);
        teamService.removeMember(teamId, userId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("成员已移除", null));
    }
    
    /** 退出团队（队员） */
    @PostMapping("/{teamId}/leave")
    public ResponseEntity<ApiResponse<Void>> leave(@PathVariable Long teamId, Authentication auth) {
        teamService.leave(teamId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("已退出团队", null));
    }

    /** 队长转让给现有成员：body {newLeaderId: 123} */
    @PostMapping("/{teamId}/transfer-leadership")
    public ResponseEntity<ApiResponse<TeamDtos.TeamView>> transferLeadership(
            @PathVariable Long teamId, @RequestBody Map<String, Object> body, Authentication auth) {
        Long newLeaderId = Long.valueOf(String.valueOf(body.get("newLeaderId")));
        return ResponseEntity.ok(ApiResponse.success("队长已转让", TeamDtos.TeamView.from(
                teamService.transferLeadership(teamId, currentUserId(auth), newLeaderId))));
    }
    
    private void requireLeader(Long teamId, Authentication auth) {
        if (!teamService.isLeader(teamId, currentUserId(auth))) {
            throw new AccessDeniedException("只有队长可以执行此操作");
        }
    }
    
    private Long currentUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
