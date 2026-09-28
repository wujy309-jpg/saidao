package com.training.backend.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 配置:
 * 1. 注册 Hibernate6 模块,序列化实体时跳过未初始化的懒加载代理;
 * 2. 关闭 USE_TRANSIENT_ANNOTATION,让 @Transient 计算字段(点赞/收藏状态、资料是否可读等)正常序列化。
 */
@Configuration
public class JacksonConfig {
    
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer hibernateModuleCustomizer() {
        return builder -> builder.modulesToInstall(
                new Hibernate6Module().disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION));
    }
}
