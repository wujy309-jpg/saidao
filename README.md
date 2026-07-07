# 软件实训全流程管理与评价系统

## 项目概述

本系统是一个完整的软件实训管理平台，支持多角色（管理员、教师、学生、企业导师）的实训任务管理、过程记录、评价反馈和数据分析功能。

## 技术栈

### 后端
- **框架**: Spring Boot 3.2.0
- **数据库**: MySQL 8.0 / H2 (开发环境)
- **ORM**: Spring Data JPA
- **安全**: Spring Security + JWT
- **构建工具**: Maven

### 前端
- **技术**: HTML5 + CSS3 + JavaScript
- **UI框架**: 自定义CSS组件库
- **图表**: Chart.js + ECharts
- **图标**: Lucide Icons

## 快速开始

### 环境要求

- JDK 17+
- Maven 3.6+
- MySQL 8.0+ (生产环境)
- Node.js 16+ (可选，用于前端开发)

### 方案一：使用H2内存数据库（开发测试）

1. **进入后端目录**
   ```bash
   cd backend
   ```

2. **编译项目**
   ```bash
   mvn clean compile
   ```

3. **运行应用**
   ```bash
   mvn spring-boot:run
   ```

4. **访问系统**
   - 前端页面: 直接用浏览器打开 `index.html`
   - 后端API: http://localhost:8080/api
   - H2控制台: http://localhost:8080/api/h2-console

### 方案二：使用MySQL数据库（生产环境）

1. **安装并启动MySQL**

2. **创建数据库**
   ```sql
   CREATE DATABASE training_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **修改数据库配置**
   
   编辑 `backend/src/main/resources/application-mysql.yml`，修改数据库连接信息：
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://localhost:3306/training_system?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shallow
       username: your_username
       password: your_password
   ```

4. **使用MySQL配置运行**
   ```bash
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=mysql
   ```

5. **初始化数据**
   
   系统首次启动时会自动创建表结构。如需手动初始化数据，执行：
   ```bash
   mysql -u root -p training_system < backend/src/main/resources/schema.sql
   ```

## 演示账号

系统预置了以下演示账号：

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 教师 | teacher01 | teacher123 |
| 学生 | student01 | student123 |
| 企业导师 | enterprise01 | enterprise123 |

## 系统功能

### 管理员功能
- 用户管理（增删改查、密码重置）
- 系统配置
- 数据导出
- 全局统计

### 教师功能
- 任务创建与分配
- 学生评价
- 过程记录查看
- 数据导出

### 学生功能
- 任务查看与提交
- 过程记录
- 评价查看
- 材料提交

### 企业导师功能
- 任务查看
- 学生评价
- 过程记录查看

## API接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `PUT /api/auth/change-password` - 修改密码

### 用户接口
- `GET /api/users` - 获取用户列表
- `GET /api/users/{id}` - 获取用户详情
- `POST /api/users` - 创建用户
- `PUT /api/users/{id}` - 更新用户
- `DELETE /api/users/{id}` - 删除用户

### 任务接口
- `GET /api/tasks/user/{userId}` - 获取用户任务
- `GET /api/tasks/project/{projectId}` - 获取项目任务
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/{id}/assign` - 分配任务
- `PUT /api/tasks/{id}/submit` - 提交任务
- `PUT /api/tasks/{id}/review` - 审核任务

### 项目接口
- `GET /api/projects` - 获取项目列表
- `GET /api/projects/{id}` - 获取项目详情
- `POST /api/projects` - 创建项目
- `PUT /api/projects/{id}/status` - 更新项目状态
- `PUT /api/projects/{id}/phase` - 更新项目阶段

### 评价接口
- `GET /api/evaluations/evaluatee/{userId}` - 获取用户评价
- `GET /api/evaluations/project/{projectId}` - 获取项目评价
- `POST /api/evaluations` - 创建评价

### 工作记录接口
- `GET /api/work-records/user/{userId}` - 获取用户记录
- `POST /api/work-records` - 创建记录
- `PUT /api/work-records/{id}` - 更新记录
- `DELETE /api/work-records/{id}` - 删除记录

### 通知接口
- `GET /api/notifications/user/{userId}` - 获取用户通知
- `PUT /api/notifications/{id}/read` - 标记已读
- `PUT /api/notifications/user/{userId}/read-all` - 全部已读

## 项目结构

```
P20/
├── index.html                 # 前端入口
├── css/                       # 样式文件
│   ├── style.css
│   ├── components.css
│   ├── animations.css
│   └── code-repo.css
├── js/                        # JavaScript文件
│   ├── api.js                 # API服务层
│   ├── api-data-manager.js    # API数据管理器
│   ├── data.js                # 数据模型定义
│   ├── app.js                 # 主应用逻辑
│   ├── code-repo.js           # 代码仓库功能
│   └── i18n.js                # 国际化
├── backend/                   # 后端项目
│   ├── pom.xml                # Maven配置
│   └── src/
│       ├── main/
│       │   ├── java/com/training/backend/
│       │   │   ├── TrainingBackendApplication.java
│       │   │   ├── config/        # 配置类
│       │   │   ├── controller/    # 控制器
│       │   │   ├── dto/           # 数据传输对象
│       │   │   ├── entity/        # 实体类
│       │   │   ├── repository/    # 仓库接口
│       │   │   ├── service/       # 服务层
│       │   │   └── util/          # 工具类
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-mysql.yml
│       │       └── schema.sql     # 数据库初始化脚本
│       └── test/                  # 测试代码
└── docs/                      # 文档
```

## 常见问题

### 1. 端口被占用
修改 `application.yml` 中的 `server.port` 配置。

### 2. 数据库连接失败
检查MySQL服务是否启动，用户名密码是否正确。

### 3. 前端无法访问后端API
确保后端服务已启动，并检查CORS配置。

### 4. 登录失败
检查用户名密码是否正确，查看后端日志获取详细错误信息。

## 开发指南

### 添加新功能

1. **后端**
   - 在 `entity` 包中创建实体类
   - 在 `repository` 包中创建仓库接口
   - 在 `service` 包中实现业务逻辑
   - 在 `controller` 包中创建REST接口

2. **前端**
   - 在 `api.js` 中添加API调用方法
   - 在 `api-data-manager.js` 中添加数据管理方法
   - 在 `app.js` 中添加页面渲染函数

### 数据库迁移

使用JPA的 `ddl-auto: update` 配置，系统启动时会自动更新表结构。生产环境建议使用Flyway或Liquibase进行数据库版本管理。

## 许可证

本项目仅供学习交流使用。
