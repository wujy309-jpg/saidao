package com.saidao.backend.dto;

import com.saidao.backend.entity.CodeRepository;
import com.saidao.backend.entity.Team;
import com.saidao.backend.entity.TeamApplication;
import com.saidao.backend.entity.TeamMember;

import java.time.LocalDateTime;
import java.util.List;

/** Public team response DTOs. They intentionally never serialize the full User entity. */
public final class TeamDtos {
    private TeamDtos() {}

    public record TeamView(Long id, String name, String slogan, String description,
                           UserBrief leader, Boolean recruiting, Integer sizeLimit,
                           Integer memberCount, String targetCompetition, LocalDateTime createdAt) {
        public static TeamView from(Team team) {
            return new TeamView(team.getId(), team.getName(), team.getSlogan(), team.getDescription(),
                    UserBrief.from(team.getLeader()), team.getRecruiting(), team.getSizeLimit(),
                    team.getMemberCount(), team.getTargetCompetition(), team.getCreatedAt());
        }
    }

    public record MemberView(Long id, UserBrief user, String role, LocalDateTime joinedAt) {
        public static MemberView from(TeamMember member) {
            return new MemberView(member.getId(), UserBrief.from(member.getUser()),
                    member.getRole() == null ? null : member.getRole().name(), member.getJoinedAt());
        }
    }

    public record ApplicationView(Long id, TeamView team, UserBrief user, String message,
                                  String status, LocalDateTime createdAt) {
        public static ApplicationView from(TeamApplication application) {
            return new ApplicationView(application.getId(), TeamView.from(application.getTeam()),
                    UserBrief.from(application.getUser()), application.getMessage(),
                    application.getStatus() == null ? null : application.getStatus().name(),
                    application.getCreatedAt());
        }
    }

    public record RepositoryView(Long id, String name, String description, String language,
                                 String visibility, LocalDateTime createdAt) {
        public static RepositoryView from(CodeRepository repository) {
            return new RepositoryView(repository.getId(), repository.getName(), repository.getDescription(),
                    repository.getLanguage(), repository.getVisibility() == null ? null : repository.getVisibility().name(),
                    repository.getCreatedAt());
        }
    }

    public record DetailView(TeamView team, List<MemberView> members, List<RepositoryView> repos,
                             boolean isMember, boolean isLeader, boolean hasPendingApplication) {}
}
