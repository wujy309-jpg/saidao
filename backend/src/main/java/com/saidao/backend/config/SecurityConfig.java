package com.saidao.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                // 公开端点
                .requestMatchers("/auth/**").permitAll()
                // 游客 SPA 页面（刷新/直达时后端 forward 到 index.html）
                .requestMatchers("/login", "/register", "/onboarding").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()
                
                // 静态资源
                .requestMatchers("/css/**", "/js/**", "/assets/**").permitAll()
                .requestMatchers("/index.html", "/sw.js", "/manifest.json", "/favicon.ico").permitAll()
                .requestMatchers("/", "/*.ico", "/*.png", "/*.svg").permitAll()
                
                // 学生功能：收藏/参赛状态/行为反馈（需登录，先于管理员规则匹配）
                .requestMatchers(HttpMethod.POST, "/competitions/*/favorite").authenticated()
                .requestMatchers(HttpMethod.PUT, "/competitions/*/status").authenticated()
                .requestMatchers(HttpMethod.POST, "/competitions/*/feedback").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/competitions/*/feedback").authenticated()
                .requestMatchers(HttpMethod.GET, "/competitions/mine").authenticated()
                // 成员搜索：认证用户可用（仓库成员管理）
                .requestMatchers(HttpMethod.GET, "/users/search").authenticated()
                
                // 管理员：竞赛库管理、用户管理、审计日志
                .requestMatchers(HttpMethod.POST, "/competitions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/competitions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/competitions/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/competitions/admin/**").hasRole("ADMIN")
                .requestMatchers("/users/**").hasRole("ADMIN")
                // 后台管理平台：静态 SPA 公开可加载（登录鉴权在前端+API 层），API 仅 ADMIN
                .requestMatchers(HttpMethod.GET, "/admin", "/admin/**").permitAll()
                .requestMatchers("/admin-api/**").hasRole("ADMIN")
                // 用户端 Token 计费接口（需登录）
                .requestMatchers("/token/**").authenticated()
                
                // 竞赛库只读浏览：游客可见（获客入口；先于 anyRequest 匹配）
                .requestMatchers(HttpMethod.GET, "/competitions", "/competitions/*", "/competitions/*/similar", "/competitions/*/works").permitAll()
                
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
            "http://localhost:3000",
            "http://localhost:4000",
            "http://127.0.0.1:4000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5500",
            "http://localhost:8080",
            "null"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
