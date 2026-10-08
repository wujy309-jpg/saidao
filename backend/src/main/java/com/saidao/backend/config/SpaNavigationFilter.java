package com.saidao.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 浏览器导航（{@code Accept: text/html} 的无扩展名路径）统一回退到 SPA 页面壳
 * {@code /index.html}，与 nginx 常见的 {@code try_files $uri /index.html} 等价。
 *
 * <p>为什么不交给 {@code StaticResourceConfig} 的 view controller：那些是
 * {@code /{path}} 这类模板映射，一旦客户端路由与真实 API 同路径（如 {@code /profile}），
 * 字面量映射的 API 方法优先级更高，页面壳永远轮不到。
 *
 * <p>本过滤器注册为普通 Bean（默认顺序在 Spring Security 之后、DispatcherServlet 之前），
 * 所以导航请求照常经过 Security 的白名单判定与响应头处理；forward 派发按 Servlet 规范
 * 不再重复经过 Security 过滤器链，直接由静态资源处理器返回页面壳。
 * API 调用（{@code *&#47;*}、{@code application/json}）不满足导航判定，行为完全不变。
 */
@Component
public class SpaNavigationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SpaNavigation.isBrowserNavigation(request)) {
            request.getRequestDispatcher("/index.html").forward(request, response);
            return;
        }
        chain.doFilter(request, response);
    }
}
