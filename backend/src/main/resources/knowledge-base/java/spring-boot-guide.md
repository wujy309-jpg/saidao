# Spring Boot实战指南

## 1. 项目结构

```
src/main/java/
├── controller/     # 控制器层，处理HTTP请求
├── service/        # 服务层，业务逻辑
├── repository/     # 数据访问层
├── entity/         # 实体类
├── dto/            # 数据传输对象
├── config/         # 配置类
├── exception/      # 异常处理
└── util/           # 工具类
```

## 2. RESTful API最佳实践

### 2.1 响应格式统一
```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "timestamp": 1234567890
}
```

### 2.2 错误处理
- 使用@ControllerAdvice全局异常处理
- 定义统一错误码
- 返回友好错误信息

### 2.3 参数验证
- 使用@Valid注解
- 自定义验证器
- 分组验证

## 3. 安全实践

### 3.1 JWT认证
- Token生成与验证
- Token刷新机制
- 权限控制

### 3.2 密码安全
- BCrypt加密
- 密码强度校验
- 登录失败锁定

### 3.3 CORS配置
- 限制允许的来源
- 限制允许的方法
- 限制允许的头部

## 4. 性能优化

### 4.1 缓存
- @Cacheable: 方法级缓存
- Redis: 分布式缓存
- 本地缓存: Caffeine

### 4.2 异步处理
- @Async: 异步方法
- 消息队列: RabbitMQ, Kafka
- 事件驱动: ApplicationEvent

### 4.3 数据库优化
- 连接池配置
- 批量操作
- 索引优化

## 5. 测试

### 5.1 单元测试
- JUnit 5
- Mockito: Mock依赖
- AssertJ: 断言

### 5.2 集成测试
- @SpringBootTest
- TestRestTemplate
- MockMvc
