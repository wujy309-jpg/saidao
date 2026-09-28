package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.entity.Team;
import com.training.backend.entity.TeamApplication;
import com.training.backend.entity.TeamMember;
import com.training.backend.service.TeamService;
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
    public ResponseEntity<ApiResponse<List<Team>>> list(
            @RequestParam(required = false) Boolean recruiting,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(teamService.listTeams(recruiting, keyword)));
    }
    
    /** 我的团队 */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<Team>>> mine(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(teamService.myTeams(currentUserId(auth))));
    }
    
    /** 团队详情（成员+项目空间+我的状态） */
    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detail(
            @PathVariable Long teamId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(teamService.detail(teamId, currentUserId(auth))));
    }
    
    /** 创建团队（创建者自动成为队长） */
    @PostMapping
    public ResponseEntity<ApiResponse<Team>> create(@RequestBody Team team, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("团队创建成功", teamService.createTeam(currentUserId(auth), team)));
    }
    
    /** 更新团队（队长） */
    @PutMapping("/{teamId}")
    public ResponseEntity<ApiResponse<Team>> update(
            @PathVariable Long teamId, @RequestBody Team team, Authentication auth) {
        requireLeader(teamId, auth);
        return ResponseEntity.ok(ApiResponse.success("团队已更新", teamService.updateTeam(teamId, team)));
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
    public ResponseEntity<ApiResponse<TeamApplication>> apply(
            @PathVariable Long teamId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String message = body == null ? null : body.get("message");
        return ResponseEntity.ok(ApiResponse.success("申请已提交", teamService.apply(teamId, currentUserId(auth), message)));
    }
    
    /** 我的申请记录 */
    @GetMapping("/applications/mine")
    public ResponseEntity<ApiResponse<List<TeamApplication>>> myApplications(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(teamService.myApplications(currentUserId(auth))));
    }
    
    /** 团队收到的申请（队长） */
    @GetMapping("/{teamId}/applications")
    public ResponseEntity<ApiResponse<List<TeamApplication>>> applications(
            @PathVariable Long teamId, Authentication auth) {
        requireLeader(teamId, auth);
        return ResponseEntity.ok(ApiResponse.success(teamService.getApplications(teamId)));
    }
    
    /** 审批申请（队长）：body {approve: true/false} */
    @PostMapping("/{teamId}/applications/{applicationId}/review")
    public ResponseEntity<ApiResponse<TeamApplication>> review(
            @PathVariable Long teamId,
            @PathVariable Long applicationId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        requireLeader(teamId, auth);
        boolean approve = Boolean.TRUE.equals(body.get("approve"));
        return ResponseEntity.ok(ApiResponse.success(
                approve ? "已通过，新成员加入团队" : "已拒绝",
                teamService.review(teamId, applicationId, approve)));
    }
    
    /** 移除成员（队长） */
    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long teamId, @PathVariable Long userId, Authentication auth) {
        requireLeader(teamId, auth);
        teamService.removeMember(teamId, userId);
        return ResponseEntity.ok(ApiResponse.success("成员已移除", null));
    }
    
    /** 退出团队（队员） */
    @PostMapping("/{teamId}/leave")
    public ResponseEntity<ApiResponse<Void>> leave(@PathVariable Long teamId, Authentication auth) {
        teamService.leave(teamId, currentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success("已退出团队", null));
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
