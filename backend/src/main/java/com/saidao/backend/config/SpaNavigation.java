package com.saidao.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.util.List;

/**
 * 识别「浏览器导航」请求：直接输网址、按 F5 刷新、从外部链接点进来。
 *
 * <p>背景：前端 BrowserRouter 的 base 就是后端 context-path {@code /api}，页面 URL 与 API 共用前缀，
 * 个别客户端路由（{@code /profile}、{@code /teams}、{@code /competitions}）甚至与 GET 接口
 * <b>完全同路径</b>。于是刷新这些页面时会撞两堵墙：
 * <ol>
 *   <li>浏览器导航不带 {@code Authorization} 头 → 被 {@code anyRequest().authenticated()} 拦成 403；</li>
 *   <li>即使放行，Spring MVC 会让同名 API 方法胜出，而它只能产出 JSON，
 *       对 {@code Accept: text/html} 抛 {@code HttpMediaTypeNotAcceptableException}(406)，
 *       随后 {@code /error} 派发又落回鉴权规则，最终表现为 403 空白页。</li>
 * </ol>
 *
 * <p>判别依据是 {@code Accept} 头：浏览器导航必然带 {@code text/html}，
 * 而前端 fetch/XHR 默认是 {@code *&#47;*} 或 {@code application/json}。
 * 因此据此放行的只是「页面壳」（不含任何数据），同名 API 的鉴权规则原样生效。
 */
public final class SpaNavigation {

    private SpaNavigation() {
    }

    /** 这些前缀归后端自己所有，即使是浏览器访问也不能当作 SPA 客户端路由 */
    private static final List<String> BACKEND_PREFIXES = List.of(
            "/admin", "/admin-api", "/auth", "/actuator", "/swagger-ui", "/api-docs",
            "/v3/api-docs", "/h2-console", "/uploads", "/avatars", "/error", "/assets", "/css", "/js");

    /** 供 Spring Security 使用的匹配器：命中即为页面导航 */
    public static final RequestMatcher MATCHER = SpaNavigation::isBrowserNavigation;

    public static boolean isBrowserNavigation(HttpServletRequest request) {
        if (!HttpMethod.GET.matches(request.getMethod())) {
            return false;
        }
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        if (accept == null || !accept.contains(MediaType.TEXT_HTML_VALUE)) {
            return false;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.isEmpty()) {
            path = "/";
        }
        if (path.contains(".")) {
            return false;   // index.html / *.js / *.css / favicon.ico 等静态文件
        }
        if (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        for (String prefix : BACKEND_PREFIXES) {
            if (path.equals(prefix) || path.startsWith(prefix + "/")) {
                return false;
            }
        }
        return true;
    }
}
