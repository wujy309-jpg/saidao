package com.saidao.backend.service;

import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI 竞赛助手:组装竞赛规则/优秀作品/画像/团队/项目/备赛计划上下文,管理会话与消息
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

    private final CompetitionRepository competitionRepository;
    private final ExcellentWorkRepository excellentWorkRepository;
    private final UserProfileRepository profileRepository;
    private final FavoriteRepository favoriteRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CodeRepositoryRepository codeRepositoryRepository;
    private final RepoFileRepository repoFileRepository;
    private final PreparationPlanRepository planRepository;
    private final PreparationTaskRepository taskRepository;
    private final AssistantSessionRepository sessionRepository;
    private final AssistantMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final DocumentService documentService;

    /** 单次会话保留的历史消息上限(控制 token) */
    private static final int MAX_HISTORY = 12;

    // ==================== 上下文组装 ====================

    /** 结构化上下文(供前端侧栏展示) */
    public Map<String, Object> buildContextData(Long competitionId, Long userId) {
        Competition c = competitionRepository.findById(competitionId).orElse(null);
        if (c == null) return null;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("competition", c);
        data.put("works", excellentWorkRepository.findByCompetitionIdOrderByYearDesc(competitionId));

        UserProfile p = profileRepository.findByUserId(userId).orElse(null);
        if (p != null) {
            Map<String, Object> profile = new LinkedHashMap<>();
            profile.put("discipline", p.getDiscipline());
            profile.put("major", p.getMajor());
            profile.put("grade", p.getGrade());
            profile.put("interests", p.getInterests());
            profile.put("skills", p.getSkills());
            profile.put("goals", p.getGoals());
            profile.put("weeklyHours", p.getWeeklyHours());
            profile.put("hasExperience", p.getHasExperience());
            data.put("profile", profile);
        } else {
            data.put("profile", null);
        }

        Favorite fav = favoriteRepository.findByUserIdAndCompetitionId(userId, competitionId).orElse(null);
        data.put("journeyStatus", fav != null ? fav.getStatus().name() : null);

        List<Map<String, Object>> teams = teamMemberRepository.findByUserId(userId).stream()
                .map(m -> {
                    Map<String, Object> t = new LinkedHashMap<>();
                    Team team = m.getTeam();
                    t.put("id", team.getId());
                    t.put("name", team.getName());
                    t.put("slogan", team.getSlogan());
                    t.put("targetCompetition", team.getTargetCompetition());
                    t.put("role", m.getRole().name());
                    t.put("memberCount", team.getMemberCount());
                    List<String> names = teamMemberRepository.findByTeamId(team.getId()).stream()
                            .map(tm -> tm.getUser() != null ? tm.getUser().getName() : null)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());
                    t.put("members", names);
                    return t;
                })
                .collect(Collectors.toList());
        data.put("teams", teams);

        List<Map<String, Object>> repos = codeRepositoryRepository.findByUserId(userId).stream()
                .limit(5)
                .map(r -> {
                    Map<String, Object> rm = new LinkedHashMap<>();
                    rm.put("name", r.getName());
                    rm.put("description", r.getDescription());
                    rm.put("language", r.getLanguage());
                    List<String> files = repoFileRepository.findByRepositoryId(r.getId()).stream()
                            .filter(f -> f.getFileType() == RepoFile.FileType.FILE)
                            .map(RepoFile::getFilePath)
                            .limit(30)
                            .collect(Collectors.toList());
                    rm.put("files", files);
                    return rm;
                })
                .collect(Collectors.toList());
        data.put("repos", repos);

        PreparationPlan plan = planRepository
                .findTopByUserIdAndCompetitionIdOrderByCreatedAtDesc(userId, competitionId)
                .orElse(null);
        if (plan != null) {
            List<PreparationTask> tasks = taskRepository.findByPlanIdOrderBySortOrderAsc(plan.getId());
            long done = tasks.stream().filter(t -> Boolean.TRUE.equals(t.getDone())).count();
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("title", plan.getTitle());
            pm.put("overview", plan.getOverview());
            pm.put("doneCount", done);
            pm.put("taskCount", tasks.size());
            pm.put("tasks", tasks.stream().map(t -> Map.of(
                    "phase", t.getPhaseTitle() == null ? "" : t.getPhaseTitle(),
                    "title", t.getTitle() == null ? "" : t.getTitle(),
                    "done", Boolean.TRUE.equals(t.getDone())
            )).collect(Collectors.toList()));
            data.put("plan", pm);
        } else {
            data.put("plan", null);
        }
        return data;
    }

    /** 组装进 system prompt 的上下文文本 */
    public String buildContextString(Long competitionId, Long userId) {
        Map<String, Object> d = buildContextData(competitionId, userId);
        if (d == null) return "";
        Competition c = (Competition) d.get("competition");
        StringBuilder sb = new StringBuilder();

        sb.append("【当前竞赛】\n");
        sb.append("名称:").append(c.getName()).append("\n");
        sb.append("类别:").append(c.getCategory().getDescription())
          .append(" | 级别:").append(c.getLevel().getDescription())
          .append(" | 形式:").append(c.getFormat().getDescription())
          .append(c.getFormat() == Competition.CompetitionFormat.TEAM && c.getTeamSizeMax() != null
                  ? "(最多" + c.getTeamSizeMax() + "人)" : "")
          .append("\n");
        if (c.getOrganizer() != null) sb.append("主办方:").append(c.getOrganizer()).append("\n");
        sb.append("报名时间:").append(str(c.getRegistrationStart())).append(" 至 ").append(str(c.getRegistrationEnd()))
          .append(" | 比赛时间:").append(str(c.getCompetitionDate())).append("\n");
        sb.append("难度:").append(c.getDifficulty()).append("/5 | 含金量:").append(c.getPrestige()).append("/5");
        if (c.getCatalogList() != null) sb.append(" | 目录:").append(c.getCatalogList());
        if (Boolean.TRUE.equals(c.getBaoyanBonus())) sb.append(" | 保研加分");
        if (c.getEntryFee() != null) sb.append(" | 报名费:").append(c.getEntryFee());
        sb.append("\n");
        if (c.getDescription() != null) sb.append("简介:").append(c.getDescription()).append("\n");
        if (c.getOfficialUrl() != null) sb.append("官网:").append(c.getOfficialUrl()).append("\n");

        if (c.getRules() != null && !c.getRules().isBlank()) {
            sb.append("\n【赛制规则与评审标准】\n").append(c.getRules()).append("\n");
        } else {
            sb.append("\n【赛制规则与评审标准】\n(暂未收录详细规则,请以官网最新通知为准,必要时引导用户打开官网链接查询)\n");
        }

        @SuppressWarnings("unchecked")
        List<ExcellentWork> works = (List<ExcellentWork>) d.get("works");
        if (works != null && !works.isEmpty()) {
            sb.append("\n【历年优秀作品(参考选题与风格)】\n");
            for (ExcellentWork w : works) {
                sb.append("- ").append(w.getTitle());
                if (w.getYear() != null) sb.append("(").append(w.getYear()).append("年");
                if (w.getAward() != null) sb.append("·").append(w.getAward());
                if (w.getYear() != null) sb.append(")");
                if (w.getTeam() != null) sb.append(" 团队:").append(w.getTeam());
                sb.append("\n");
                if (w.getDescription() != null && !w.getDescription().isBlank()) {
                    sb.append("  简介:").append(w.getDescription()).append("\n");
                }
                if (w.getLink() != null) sb.append("  链接:").append(w.getLink()).append("\n");
            }
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) d.get("profile");
        if (profile != null) {
            sb.append("\n【学生画像】\n");
            sb.append("学科:").append(str(profile.get("discipline")));
            if (profile.get("major") != null) sb.append(" | 专业:").append(profile.get("major"));
            if (profile.get("grade") != null) sb.append(" | 年级:").append(profile.get("grade"));
            sb.append("\n");
            sb.append("兴趣:").append(strList(profile.get("interests"))).append("\n");
            sb.append("技能:").append(strList(profile.get("skills"))).append("\n");
            sb.append("目标:").append(strList(profile.get("goals"))).append("\n");
            if (profile.get("weeklyHours") != null) sb.append("每周可投入:").append(profile.get("weeklyHours")).append("小时");
            if (profile.get("hasExperience") != null)
                sb.append(" | 参赛经历:").append(Boolean.TRUE.equals(profile.get("hasExperience")) ? "有" : "无");
            sb.append("\n");
        }

        if (d.get("journeyStatus") != null) {
            String js = (String) d.get("journeyStatus");
            String label = switch (js) {
                case "WATCHING" -> "关注中";
                case "REGISTERED" -> "已报名";
                case "PREPARING" -> "备赛中";
                case "COMPLETED" -> "已完赛";
                case "AWARDED" -> "已获奖";
                default -> js;
            };
            sb.append("当前参赛状态:").append(label).append("\n");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> teams = (List<Map<String, Object>>) d.get("teams");
        if (teams != null && !teams.isEmpty()) {
            sb.append("\n【我的团队】\n");
            for (Map<String, Object> t : teams) {
                sb.append("- ").append(t.get("name")).append("(我的角色:").append(t.get("role")).append(")");
                if (t.get("slogan") != null) sb.append(" 口号:").append(t.get("slogan"));
                if (t.get("targetCompetition") != null) sb.append(" 目标赛事:").append(t.get("targetCompetition"));
                sb.append(" 成员:").append(t.get("members")).append("\n");
            }
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> repos = (List<Map<String, Object>>) d.get("repos");
        if (repos != null && !repos.isEmpty()) {
            sb.append("\n【项目空间(团队协作素材)】\n");
            for (Map<String, Object> r : repos) {
                sb.append("- 仓库:").append(r.get("name"));
                if (r.get("description") != null && !String.valueOf(r.get("description")).isBlank())
                    sb.append("(").append(r.get("description")).append(")");
                sb.append("\n");
                @SuppressWarnings("unchecked")
                List<String> files = (List<String>) r.get("files");
                if (files != null && !files.isEmpty()) {
                    sb.append("  文件:").append(String.join("、", files)).append("\n");
                }
            }
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> plan = (Map<String, Object>) d.get("plan");
        if (plan != null) {
            sb.append("\n【备赛计划进度】\n");
            sb.append("计划:").append(plan.get("title"))
              .append(" | 进度:").append(plan.get("doneCount")).append("/").append(plan.get("taskCount")).append("\n");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tasks = (List<Map<String, Object>>) plan.get("tasks");
            if (tasks != null) {
                for (Map<String, Object> t : tasks) {
                    sb.append("- ").append(Boolean.TRUE.equals(t.get("done")) ? "[已完成]" : "[未完成]")
                      .append(" ").append(t.get("phase")).append(" > ").append(t.get("title")).append("\n");
                }
            }
        }

        // 用户上传的资料(规则/要求/笔记)
        List<UserDocument> docs = documentService.listWithText(userId, competitionId);
        if (docs != null && !docs.isEmpty()) {
            sb.append("\n【用户上传的资料】\n");
            int cap = 0;
            for (UserDocument doc : docs) {
                if (cap >= 3) break;
                String text = doc.getContentText();
                int limit = Math.min(text.length(), 2500);
                sb.append("文件:").append(doc.getFileName()).append("\n")
                  .append(text, 0, limit).append("\n\n");
                cap++;
            }
        }
        return sb.toString();
    }

    public String buildSystemPrompt(Long competitionId, Long userId) {
        String context = buildContextString(competitionId, userId);
        return """
                你是「赛道」平台的大学生竞赛 AI 助手。用户正在备赛或参赛,你要基于提供的竞赛上下文,
                帮助学生:1) 解读赛制规则、报名流程与评审标准;2) 制定参赛方案与备赛策略;
                3) 直接产出比赛文书(商业计划书、论文框架与章节内容、答辩 PPT 大纲、申报书、策划案、演讲稿等);
                4) 生成小程序/网站/网页等作品代码。

                作品代码输出格式(重要):
                - 当用户要求生成小程序/网站/网页等作品时,先给一句文件清单说明,再按文件逐个输出;
                - 每个文件严格按以下格式:先单独一行 "FILE: 相对路径"(如 FILE: app.json),紧接着一个 ``` 代码块包含该文件全部内容;
                - 文件之间空一行;不要输出运行说明以外的额外解释,运行说明放在清单说明里。

                写作要求:
                - 紧扣下方【赛制规则与评审标准】逐条对照,产出内容要"踩点评分";
                - 参考【历年优秀作品】的选题方向、项目立意与写作风格;
                - 若下方有【用户上传的资料】(老师发的题目要求、评分细则等),以它们为最高优先级依据;
                - 结构清晰,使用 Markdown 分节;长文档一次输出不完时,先给完整大纲再逐节展开;
                - 结合学生画像、团队分工、项目空间素材与备赛计划进度,让产出贴合实际、可直接使用;
                - 需要学生补充信息(项目名、数据、成员分工等)时,先列出需要的信息再给出可套用的模板。

                边界:
                - 规则细节以官方最新通知为准,不确定处标注"以官网为准";
                - 不代替报名与提交,提醒用户按时在官网完成;
                - 拒绝代写任何作弊/抄袭内容,鼓励在模板基础上加入自己的原创内容。

                """ + context;
    }

    // ==================== 会话与消息 ====================

    public List<AssistantSession> listSessions(Long userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public List<AssistantMessage> listMessages(Long userId, Long sessionId) {
        if (!sessionRepository.existsByIdAndUserId(sessionId, userId)) return List.of();
        return messageRepository.findBySessionIdOrderByIdAsc(sessionId);
    }

    @Transactional
    public AssistantSession getOrCreateSession(Long userId, Long competitionId, Long sessionId, String firstMessage) {
        AssistantSession session = null;
        if (sessionId != null) {
            session = sessionRepository.findById(sessionId)
                    .filter(s -> s.getUserId().equals(userId))
                    .orElse(null);
        }
        if (session == null) {
            session = new AssistantSession();
            session.setUserId(userId);
            session.setCompetitionId(competitionId);
            Competition c = competitionRepository.findById(competitionId).orElse(null);
            if (c != null) session.setCompetitionName(c.getName());
            String title = firstMessage == null ? "新对话" : firstMessage.trim();
            session.setTitle(title.length() > 24 ? title.substring(0, 24) + "…" : title);
            session = sessionRepository.save(session);
        }
        return session;
    }

    @Transactional
    public AssistantMessage saveUserMessage(Long sessionId, String content) {
        AssistantMessage m = new AssistantMessage();
        m.setSessionId(sessionId);
        m.setRole(AssistantMessage.Role.USER);
        m.setContent(content);
        return messageRepository.save(m);
    }

    @Transactional
    public AssistantMessage saveAssistantMessage(Long sessionId, String content) {
        AssistantMessage m = new AssistantMessage();
        m.setSessionId(sessionId);
        m.setRole(AssistantMessage.Role.ASSISTANT);
        m.setContent(content);
        return messageRepository.save(m);
    }

    @Transactional
    public boolean deleteSession(Long userId, Long sessionId) {
        if (!sessionRepository.existsByIdAndUserId(sessionId, userId)) return false;
        messageRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteById(sessionId);
        return true;
    }

    /** 组装发给大模型的历史消息(最近 MAX_HISTORY 条,跳过空内容占位) */
    public List<DeepSeekService.Message> buildLlmHistory(Long userId, Long sessionId) {
        return buildLlmHistoryExcluding(userId, sessionId, null);
    }

    /** 组装历史消息(跳过空内容占位,可排除指定消息,用于续写断点) */
    public List<DeepSeekService.Message> buildLlmHistoryExcluding(Long userId, Long sessionId, Long excludeMessageId) {
        List<AssistantMessage> history = messageRepository.findBySessionIdOrderByIdAsc(sessionId).stream()
                .filter(m -> m.getContent() != null && !m.getContent().isBlank())
                .filter(m -> excludeMessageId == null || !m.getId().equals(excludeMessageId))
                .collect(Collectors.toList());
        List<AssistantMessage> recent = history.size() > MAX_HISTORY
                ? history.subList(history.size() - MAX_HISTORY, history.size())
                : history;
        return recent.stream()
                .map(m -> new DeepSeekService.Message(
                        m.getRole() == AssistantMessage.Role.USER ? "user" : "assistant",
                        m.getContent()))
                .collect(Collectors.toList());
    }

    /** 会话归属校验 */
    public AssistantSession getSession(Long userId, Long sessionId) {
        return sessionRepository.findById(sessionId)
                .filter(s -> s.getUserId().equals(userId))
                .orElse(null);
    }

    /** 会话内消息归属校验 */
    public AssistantMessage getMessage(Long userId, Long sessionId, Long messageId) {
        if (!sessionRepository.existsByIdAndUserId(sessionId, userId)) return null;
        return messageRepository.findById(messageId)
                .filter(m -> m.getSessionId().equals(sessionId))
                .orElse(null);
    }

    @Transactional
    public void updateAssistantMessage(Long messageId, String content) {
        messageRepository.findById(messageId).ifPresent(m -> {
            m.setContent(content == null ? "" : content);
            messageRepository.save(m);
        });
    }

    /** 暂停回写:仅消息所属会话的拥有者可更新 */
    @Transactional
    public boolean updateMessageIfOwner(Long userId, Long messageId, String content) {
        AssistantMessage m = messageRepository.findById(messageId).orElse(null);
        if (m == null) return false;
        AssistantSession s = sessionRepository.findById(m.getSessionId()).orElse(null);
        if (s == null || !s.getUserId().equals(userId)) return false;
        m.setContent(content == null ? "" : content);
        messageRepository.save(m);
        return true;
    }

    // ==================== 工具 ====================

    private String str(Object o) {
        return o == null ? "待定" : String.valueOf(o);
    }

    @SuppressWarnings("unchecked")
    private String strList(Object o) {
        if (o instanceof List<?> list) {
            return list.isEmpty() ? "(未填写)" : String.join("、", list.stream().map(String::valueOf).toList());
        }
        return "(未填写)";
    }
}
