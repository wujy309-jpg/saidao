package com.saidao.backend.service;

import com.saidao.backend.dto.TeamBrief;
import com.saidao.backend.entity.Team;
import com.saidao.backend.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 团队查询服务:批量获取 TeamBrief,避免 N+1 查询
 */
@Service
@RequiredArgsConstructor
public class TeamQueryService {

    private final TeamRepository teamRepository;

    /**
     * 批量获取 TeamBrief 映射
     * @param teamIds 团队 ID 集合(可含 null,自动忽略)
     * @return Map<teamId, TeamBrief>
     */
    public Map<Long, TeamBrief> getBriefs(Collection<Long> teamIds) {
        if (teamIds == null || teamIds.isEmpty()) {
            return Collections.emptyMap();
        }
        var validIds = teamIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (validIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return teamRepository.findAllById(validIds).stream()
                .collect(Collectors.toMap(Team::getId, TeamBrief::from, (a, b) -> a));
    }
}
