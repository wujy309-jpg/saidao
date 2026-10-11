package com.saidao.backend.service;

import com.saidao.backend.entity.Competition;
import com.saidao.backend.entity.ExcellentWork;
import com.saidao.backend.repository.CompetitionRepository;
import com.saidao.backend.repository.ExcellentWorkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * 链接体检：定期探测竞赛官网与优秀作品资源的可达性。
 *
 * <p>背景：2026-10-11 排查发现 88 个竞赛里有 15 个官网已经失效——有的域名被抢注成
 * 「域名出售」停放页，有的换站，有的只是 https 挂了。这类失效是持续发生的，靠人工发现不了。
 *
 * <p>关键点：**必须在服务器上跑**。同一批链接在我本地测得 24 条不通，换到阿里云（中国网络）
 * 只剩 10 条真失效——境外网络会大量误判，体检结果也就没有参考价值。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LinkHealthService {

    private final CompetitionRepository competitionRepository;
    private final ExcellentWorkRepository excellentWorkRepository;

    /** 站点普遍对默认 UA 不友好，部分站直接 403；用常见浏览器 UA */
    private static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            + "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
    private static final int THREADS = 4;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /**
     * 每天 04:30 全量体检一次（避开使用高峰）。
     *
     * <p>首批 163 条链接 × 4 线程 ≈ 数分钟，2C2G 机器可承受；失败只记日志，不影响其它任务。
     */
    @Scheduled(cron = "0 30 4 * * *")
    public void scheduledCheck() {
        try {
            Map<String, Object> r = checkAll();
            log.info("链接体检完成：竞赛官网 {} 条（失效 {}），优秀作品 {} 条（失效 {}）",
                    r.get("competitionTotal"), r.get("competitionBroken"),
                    r.get("workTotal"), r.get("workBroken"));
        } catch (Exception e) {
            log.error("链接体检失败: {}", e.getMessage(), e);
        }
    }

    /** 全量体检：竞赛官网 + 优秀作品链接 */
    public Map<String, Object> checkAll() {
        List<Competition> comps = competitionRepository.findAll();
        List<ExcellentWork> works = excellentWorkRepository.findAll();

        List<Competition> needComps = new ArrayList<>();
        for (Competition c : comps) {
            if (c.getOfficialUrl() != null && !c.getOfficialUrl().isBlank()) {
                needComps.add(c);
            }
        }
        List<ExcellentWork> needWorks = new ArrayList<>();
        for (ExcellentWork w : works) {
            if (w.getLink() != null && !w.getLink().isBlank()) {
                needWorks.add(w);
            }
        }

        long compBroken = probeAndSave(needComps);
        long workBroken = probeAndSaveWorks(needWorks);

        Map<String, Object> summary = summary();
        summary.put("competitionBroken", compBroken);
        summary.put("workBroken", workBroken);
        return summary;
    }

    private long probeAndSave(List<Competition> items) {
        if (items.isEmpty()) return 0;
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        long broken = 0;
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (Competition c : items) {
                futures.add(pool.submit(() -> {
                    int status = probe(c.getOfficialUrl());
                    c.setLinkStatus(status);
                    c.setLinkCheckedAt(LocalDateTime.now());
                }));
            }
            for (Future<?> f : futures) {
                try {
                    f.get();
                } catch (Exception ignored) {
                }
            }
            broken = items.stream().filter(c -> isBroken(c.getLinkStatus())).count();
            saveCompetitions(items);
        } finally {
            pool.shutdownNow();
        }
        return broken;
    }

    private long probeAndSaveWorks(List<ExcellentWork> items) {
        if (items.isEmpty()) return 0;
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        long broken = 0;
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (ExcellentWork w : items) {
                futures.add(pool.submit(() -> {
                    int status = probe(w.getLink());
                    w.setLinkStatus(status);
                    w.setLinkCheckedAt(LocalDateTime.now());
                }));
            }
            for (Future<?> f : futures) {
                try {
                    f.get();
                } catch (Exception ignored) {
                }
            }
            broken = items.stream().filter(w -> isBroken(w.getLinkStatus())).count();
            saveWorks(items);
        } finally {
            pool.shutdownNow();
        }
        return broken;
    }

    // 注意：这里不能用 @Transactional —— 同类内部调用不走代理，注解不会生效。
    // saveAll 本身每个实体各自成事务，体检场景不需要整体原子性。
    private void saveCompetitions(List<Competition> items) {
        competitionRepository.saveAll(items);
    }

    private void saveWorks(List<ExcellentWork> items) {
        excellentWorkRepository.saveAll(items);
    }

    /**
     * 探测单个链接。
     *
     * @return HTTP 状态码；连接失败/超时返回 0
     */
    public int probe(String url) {
        if (url == null || url.isBlank()) return 0;
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url.trim()))
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", UA)
                    .header("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
                    .GET()
                    .build();
            // 只要状态码，丢弃响应体：省带宽、也避免把整站拉下来
            HttpResponse<Void> resp = client.send(req, HttpResponse.BodyHandlers.discarding());
            return resp.statusCode();
        } catch (Exception e) {
            return 0;
        }
    }

    private boolean isBroken(Integer status) {
        return status == null || status == 0 || status >= 400;
    }

    /** 体检汇总 + 失效清单（后台页面用） */
    public Map<String, Object> summary() {
        List<Competition> comps = competitionRepository.findAll();
        List<ExcellentWork> works = excellentWorkRepository.findAll();

        List<Map<String, Object>> broken = new ArrayList<>();
        int compOk = 0, compBroken = 0, compUnchecked = 0;
        LocalDateTime lastChecked = null;

        for (Competition c : comps) {
            if (c.getOfficialUrl() == null || c.getOfficialUrl().isBlank()) continue;
            if (c.getLinkCheckedAt() != null
                    && (lastChecked == null || c.getLinkCheckedAt().isAfter(lastChecked))) {
                lastChecked = c.getLinkCheckedAt();
            }
            if (c.getLinkStatus() == null) {
                compUnchecked++;
            } else if (isBroken(c.getLinkStatus())) {
                compBroken++;
                broken.add(entry("COMPETITION", c.getName(), c.getOfficialUrl(), c.getLinkStatus(), c.getLinkCheckedAt()));
            } else {
                compOk++;
            }
        }

        int workOk = 0, workBroken = 0, workUnchecked = 0;
        for (ExcellentWork w : works) {
            if (w.getLink() == null || w.getLink().isBlank()) continue;
            if (w.getLinkCheckedAt() != null
                    && (lastChecked == null || w.getLinkCheckedAt().isAfter(lastChecked))) {
                lastChecked = w.getLinkCheckedAt();
            }
            if (w.getLinkStatus() == null) {
                workUnchecked++;
            } else if (isBroken(w.getLinkStatus())) {
                workBroken++;
                broken.add(entry("WORK", w.getCompetitionName() + " · " + w.getTitle(),
                        w.getLink(), w.getLinkStatus(), w.getLinkCheckedAt()));
            } else {
                workOk++;
            }
        }

        broken.sort((a, b) -> Integer.compare((int) a.get("status"), (int) b.get("status")));

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("competitionTotal", compOk + compBroken + compUnchecked);
        m.put("competitionOk", compOk);
        m.put("competitionBroken", compBroken);
        m.put("competitionUnchecked", compUnchecked);
        m.put("workTotal", workOk + workBroken + workUnchecked);
        m.put("workOk", workOk);
        m.put("workBroken", workBroken);
        m.put("workUnchecked", workUnchecked);
        m.put("lastCheckedAt", lastChecked);
        m.put("broken", broken);
        return m;
    }

    private Map<String, Object> entry(String type, String name, String url, Integer status, LocalDateTime at) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("type", type);
        e.put("name", name);
        e.put("url", url);
        e.put("status", status == null ? 0 : status);
        e.put("checkedAt", at);
        return e;
    }
}
