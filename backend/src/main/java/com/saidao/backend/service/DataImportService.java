package com.saidao.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.ExcellentWork;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.ExcellentWorkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 竞赛数据批量导入（带 dry-run 预览）。
 *
 * <p>背景：后台原先只有单条 CRUD。补一轮数据要手工点几十次表单，而且无法先看「这次导入会改什么」。
 * 这里提供「先预览、再提交」的两段式导入，按名称 upsert，与种子文件同步逻辑保持一致。
 *
 * <p>导入的字段做白名单式覆盖：只覆盖请求里**显式给出**的字段，未给出的保持原值，
 * 避免一次导入把没写的字段清空。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataImportService {

    private final CompetitionRepository competitionRepository;
    private final ExcellentWorkRepository excellentWorkRepository;
    private final ObjectMapper objectMapper;

    /** 一次导入的条目上限，防止误贴大文件把 2C2G 机器打满 */
    private static final int MAX_ITEMS = 500;

    /* ==================== 竞赛导入 ==================== */

    @Transactional
    public Map<String, Object> importCompetitions(List<Map<String, Object>> items, boolean dryRun) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("导入内容为空");
        }
        if (items.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("单次最多导入 " + MAX_ITEMS + " 条，当前 " + items.size() + " 条");
        }

        int created = 0, updated = 0, unchanged = 0;
        List<Map<String, Object>> changes = new ArrayList<>();
        List<Map<String, Object>> invalid = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> raw = items.get(i);
            String name = str(raw.get("name"));
            if (name.isBlank()) {
                invalid.add(problem(i, "(无名称)", "缺少 name 字段"));
                continue;
            }

            Competition parsed;
            try {
                parsed = objectMapper.convertValue(raw, Competition.class);
            } catch (Exception e) {
                invalid.add(problem(i, name, shortMsg(e)));
                continue;
            }

            Competition existing = competitionRepository.findByNameContainingIgnoreCase(name).stream()
                    .filter(c -> c.getName().equalsIgnoreCase(name))
                    .findFirst().orElse(null);

            // 必填校验只针对「新增」：更新是部分更新，只传 name + rules 是合法用法
            if (existing == null
                    && (parsed.getCategory() == null || parsed.getLevel() == null || parsed.getFormat() == null)) {
                invalid.add(problem(i, name, "新增竞赛时 category / level / format 为必填"));
                continue;
            }

            if (existing == null) {
                created++;
                changes.add(change(name, "新增", List.of()));
                if (!dryRun) {
                    parsed.setId(null);
                    competitionRepository.save(parsed);
                }
            } else {
                List<String> fields = syncFields(existing, raw, parsed, !dryRun);
                if (fields.isEmpty()) {
                    unchanged++;
                } else {
                    updated++;
                    changes.add(change(name, "更新", fields));
                    if (!dryRun) {
                        competitionRepository.save(existing);
                    }
                }
            }
        }

        return report(dryRun, items.size(), created, updated, unchanged, changes, invalid);
    }

    /**
     * 只覆盖请求里显式给出的字段。
     *
     * @return 实际发生变化的字段名列表（空表示无变化）
     */
    private List<String> syncFields(Competition t, Map<String, Object> raw, Competition src, boolean apply) {
        List<String> changed = new ArrayList<>();
        if (raw.containsKey("category") && src.getCategory() != t.getCategory()) {
            changed.add("category");
            if (apply) t.setCategory(src.getCategory());
        }
        if (raw.containsKey("level") && src.getLevel() != t.getLevel()) {
            changed.add("level");
            if (apply) t.setLevel(src.getLevel());
        }
        if (raw.containsKey("format") && src.getFormat() != t.getFormat()) {
            changed.add("format");
            if (apply) t.setFormat(src.getFormat());
        }
        if (raw.containsKey("organizer") && !Objects.equals(src.getOrganizer(), t.getOrganizer())) {
            changed.add("organizer");
            if (apply) t.setOrganizer(src.getOrganizer());
        }
        if (raw.containsKey("officialUrl") && !Objects.equals(src.getOfficialUrl(), t.getOfficialUrl())) {
            changed.add("officialUrl");
            if (apply) t.setOfficialUrl(src.getOfficialUrl());
        }
        if (raw.containsKey("rules") && !Objects.equals(src.getRules(), t.getRules())) {
            changed.add("rules");
            if (apply) t.setRules(src.getRules());
        }
        if (raw.containsKey("description") && !Objects.equals(src.getDescription(), t.getDescription())) {
            changed.add("description");
            if (apply) t.setDescription(src.getDescription());
        }
        if (raw.containsKey("catalogList") && !Objects.equals(src.getCatalogList(), t.getCatalogList())) {
            changed.add("catalogList");
            if (apply) t.setCatalogList(src.getCatalogList());
        }
        if (raw.containsKey("entryFee") && !Objects.equals(src.getEntryFee(), t.getEntryFee())) {
            changed.add("entryFee");
            if (apply) t.setEntryFee(src.getEntryFee());
        }
        if (raw.containsKey("baoyanBonus") && !Objects.equals(src.getBaoyanBonus(), t.getBaoyanBonus())) {
            changed.add("baoyanBonus");
            if (apply) t.setBaoyanBonus(src.getBaoyanBonus());
        }
        if (raw.containsKey("difficulty") && !Objects.equals(src.getDifficulty(), t.getDifficulty())) {
            changed.add("difficulty");
            if (apply) t.setDifficulty(src.getDifficulty());
        }
        if (raw.containsKey("prestige") && !Objects.equals(src.getPrestige(), t.getPrestige())) {
            changed.add("prestige");
            if (apply) t.setPrestige(src.getPrestige());
        }
        if (raw.containsKey("teamSizeMax") && !Objects.equals(src.getTeamSizeMax(), t.getTeamSizeMax())) {
            changed.add("teamSizeMax");
            if (apply) t.setTeamSizeMax(src.getTeamSizeMax());
        }
        if (raw.containsKey("registrationStart") && !Objects.equals(src.getRegistrationStart(), t.getRegistrationStart())) {
            changed.add("registrationStart");
            if (apply) t.setRegistrationStart(src.getRegistrationStart());
        }
        if (raw.containsKey("registrationEnd") && !Objects.equals(src.getRegistrationEnd(), t.getRegistrationEnd())) {
            changed.add("registrationEnd");
            if (apply) t.setRegistrationEnd(src.getRegistrationEnd());
        }
        if (raw.containsKey("competitionDate") && !Objects.equals(src.getCompetitionDate(), t.getCompetitionDate())) {
            changed.add("competitionDate");
            if (apply) t.setCompetitionDate(src.getCompetitionDate());
        }
        if (raw.containsKey("disciplines") && !Objects.equals(src.getDisciplines(), t.getDisciplines())) {
            changed.add("disciplines");
            if (apply) t.setDisciplines(src.getDisciplines());
        }
        if (raw.containsKey("tags") && !Objects.equals(src.getTags(), t.getTags())) {
            changed.add("tags");
            if (apply) t.setTags(src.getTags());
        }
        if (raw.containsKey("suitableGrades") && !Objects.equals(src.getSuitableGrades(), t.getSuitableGrades())) {
            changed.add("suitableGrades");
            if (apply) t.setSuitableGrades(src.getSuitableGrades());
        }
        // 官网有变则视为「未体检」，下次体检会重新探测，避免旧状态误导
        if (apply && changed.contains("officialUrl")) {
            t.setLinkStatus(null);
            t.setLinkCheckedAt(null);
        }
        return changed;
    }

    /* ==================== 优秀作品导入 ==================== */

    @Transactional
    public Map<String, Object> importWorks(List<Map<String, Object>> items, boolean dryRun) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("导入内容为空");
        }
        if (items.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("单次最多导入 " + MAX_ITEMS + " 条，当前 " + items.size() + " 条");
        }

        int created = 0, updated = 0, unchanged = 0;
        List<Map<String, Object>> changes = new ArrayList<>();
        List<Map<String, Object>> invalid = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> raw = items.get(i);
            String compName = str(raw.get("competitionName"));
            String title = str(raw.get("title"));
            if (compName.isBlank() || title.isBlank()) {
                invalid.add(problem(i, title.isBlank() ? compName : title, "competitionName 与 title 为必填"));
                continue;
            }
            // 必须能绑上竞赛：优作是按竞赛名匹配入库的，绑不上就会静默丢失
            Competition comp = competitionRepository.findByNameContainingIgnoreCase(compName).stream()
                    .filter(c -> c.getName().equalsIgnoreCase(compName))
                    .findFirst().orElse(null);
            if (comp == null) {
                invalid.add(problem(i, title, "找不到同名竞赛：" + compName));
                continue;
            }

            ExcellentWork parsed;
            try {
                parsed = objectMapper.convertValue(raw, ExcellentWork.class);
            } catch (Exception e) {
                invalid.add(problem(i, title, shortMsg(e)));
                continue;
            }
            if (str(raw.get("link")).isBlank()) {
                invalid.add(problem(i, title, "缺少 link"));
                continue;
            }

            ExcellentWork existing = excellentWorkRepository
                    .findByCompetitionIdOrderBySortOrderAscYearDesc(comp.getId()).stream()
                    .filter(w -> w.getTitle().equalsIgnoreCase(title))
                    .findFirst().orElse(null);

            if (existing == null) {
                created++;
                changes.add(change(compName + " · " + title, "新增", List.of()));
                if (!dryRun) {
                    parsed.setId(null);
                    parsed.setCompetitionId(comp.getId());
                    parsed.setCompetitionName(comp.getName());
                    parsed.setLinkStatus(null);
                    parsed.setLinkCheckedAt(null);
                    excellentWorkRepository.save(parsed);
                }
            } else {
                // 同样：预览阶段绝不能改受管实体——JPA 脏检查会在提交时把「预览」变成真写入
                boolean apply = !dryRun;
                List<String> fields = new ArrayList<>();
                if (!Objects.equals(parsed.getDescription(), existing.getDescription())) {
                    fields.add("description");
                    if (apply) existing.setDescription(parsed.getDescription());
                }
                if (parsed.getYear() != null && !Objects.equals(parsed.getYear(), existing.getYear())) {
                    fields.add("year");
                    if (apply) existing.setYear(parsed.getYear());
                }
                if (parsed.getAward() != null && !Objects.equals(parsed.getAward(), existing.getAward())) {
                    fields.add("award");
                    if (apply) existing.setAward(parsed.getAward());
                }
                if (parsed.getTeam() != null && !Objects.equals(parsed.getTeam(), existing.getTeam())) {
                    fields.add("team");
                    if (apply) existing.setTeam(parsed.getTeam());
                }
                if (parsed.getType() != null && !Objects.equals(parsed.getType(), existing.getType())) {
                    fields.add("type");
                    if (apply) existing.setType(parsed.getType());
                }
                if (!Objects.equals(parsed.getLink(), existing.getLink())) {
                    fields.add("link");
                    if (apply) {
                        existing.setLink(parsed.getLink());
                        existing.setLinkStatus(null);
                        existing.setLinkCheckedAt(null);
                    }
                }
                if (fields.isEmpty()) {
                    unchanged++;
                } else {
                    updated++;
                    changes.add(change(compName + " · " + title, "更新", fields));
                    if (!dryRun) {
                        excellentWorkRepository.save(existing);
                    }
                }
            }
        }

        return report(dryRun, items.size(), created, updated, unchanged, changes, invalid);
    }

    /* ==================== 工具 ==================== */

    private Map<String, Object> report(boolean dryRun, int total, int created, int updated, int unchanged,
                                       List<Map<String, Object>> changes, List<Map<String, Object>> invalid) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("dryRun", dryRun);
        m.put("total", total);
        m.put("created", created);
        m.put("updated", updated);
        m.put("unchanged", unchanged);
        m.put("invalidCount", invalid.size());
        // 预览最多回 100 条明细，避免响应过大
        m.put("changes", changes.size() > 100 ? changes.subList(0, 100) : changes);
        m.put("changesTruncated", changes.size() > 100);
        m.put("invalid", invalid);
        return m;
    }

    private Map<String, Object> change(String name, String action, List<String> fields) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("name", name);
        c.put("action", action);
        c.put("fields", fields);
        return c;
    }

    private Map<String, Object> problem(int index, String name, String reason) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("index", index);
        p.put("name", name);
        p.put("reason", reason);
        return p;
    }

    private String shortMsg(Exception e) {
        String m = e.getMessage();
        if (m == null) return e.getClass().getSimpleName();
        int nl = m.indexOf('\n');
        return (nl > 0 ? m.substring(0, nl) : m).substring(0, Math.min(140, m.length()));
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }
}
