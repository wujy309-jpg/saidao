package com.training.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 主站 SPA 静态资源
        registry.addResourceHandler("/**")
                .addResourceLocations("file:/app/static/", "classpath:/static/");
        // 后台管理平台 SPA（独立构建，挂在 /api/admin/）
        registry.addResourceHandler("/admin/**")
                .addResourceLocations("file:/app/admin-static/", "file:./admin-static/", "classpath:/static-admin/");
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 主站 SPA 路由：所有非API路径都返回 index.html
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/{path:[^\\.]*}").setViewName("forward:/index.html");
        registry.addViewController("/{path:[^\\.]*}/{path2:[^\\.]*}").setViewName("forward:/index.html");

        // 后台管理平台 SPA 路由回退（带点的静态文件由 /admin/** 资源处理器直接服务）
        registry.addViewController("/admin").setViewName("forward:/admin/index.html");
        registry.addViewController("/admin/").setViewName("forward:/admin/index.html");
        registry.addViewController("/admin/{path:[^\\.]*}").setViewName("forward:/admin/index.html");
        registry.addViewController("/admin/{path:[^\\.]*}/{path2:[^\\.]*}").setViewName("forward:/admin/index.html");
    }
}
