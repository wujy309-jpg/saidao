/**
 * 代码仓库协作模块 - 前端完整实现
 * 包含：模拟数据、数据管理层、UI渲染、交互逻辑
 */

// ==================== 模拟数据 ====================

const MOCK_REPOSITORIES = [
  {
    id: 'repo_001',
    name: 'student-info-system',
    description: '学生信息管理系统主仓库，包含前后端完整代码',
    projectId: 'project_001',
    ownerId: 'user_003',
    defaultBranch: 'main',
    visibility: 'private',
    language: 'Java',
    starCount: 3,
    createdAt: '2026-03-28 10:00',
    updatedAt: '2026-05-20 16:30'
  },
  {
    id: 'repo_002',
    name: 'frontend-app',
    description: '前端应用代码 - Vue.js + Element Plus',
    projectId: 'project_001',
    ownerId: 'user_004',
    defaultBranch: 'main',
    visibility: 'private',
    language: 'JavaScript',
    starCount: 1,
    createdAt: '2026-04-05 14:00',
    updatedAt: '2026-05-18 11:20'
  },
  {
    id: 'repo_003',
    name: 'api-gateway',
    description: 'API网关服务 - Spring Cloud Gateway',
    projectId: 'project_001',
    ownerId: 'user_002',
    defaultBranch: 'main',
    visibility: 'public',
    language: 'Java',
    starCount: 5,
    createdAt: '2026-04-10 09:00',
    updatedAt: '2026-05-22 09:15'
  }
];

const MOCK_REPO_MEMBERS = [
  { repoId: 'repo_001', userId: 'user_002', role: 'maintainer', invitedBy: 'user_003', createdAt: '2026-03-28' },
  { repoId: 'repo_001', userId: 'user_003', role: 'owner', invitedBy: null, createdAt: '2026-03-28' },
  { repoId: 'repo_001', userId: 'user_004', role: 'developer', invitedBy: 'user_003', createdAt: '2026-03-30' },
  { repoId: 'repo_002', userId: 'user_003', role: 'developer', invitedBy: 'user_004', createdAt: '2026-04-05' },
  { repoId: 'repo_002', userId: 'user_004', role: 'owner', invitedBy: null, createdAt: '2026-04-05' },
  { repoId: 'repo_003', userId: 'user_002', role: 'owner', invitedBy: null, createdAt: '2026-04-10' },
  { repoId: 'repo_003', userId: 'user_003', role: 'developer', invitedBy: 'user_002', createdAt: '2026-04-10' },
  { repoId: 'repo_003', userId: 'user_004', role: 'developer', invitedBy: 'user_002', createdAt: '2026-04-10' }
];

const MOCK_BRANCHES = [
  { repoId: 'repo_001', name: 'main', latestCommitId: 'a1b2c3d4e5', isProtected: true, createdBy: 'user_003', createdAt: '2026-03-28' },
  { repoId: 'repo_001', name: 'dev', latestCommitId: 'f6g7h8i9j0', isProtected: false, createdBy: 'user_003', createdAt: '2026-04-01' },
  { repoId: 'repo_001', name: 'feature/login', latestCommitId: 'k1l2m3n4o5', isProtected: false, createdBy: 'user_004', createdAt: '2026-04-15' },
  { repoId: 'repo_002', name: 'main', latestCommitId: 'p6q7r8s9t0', isProtected: true, createdBy: 'user_004', createdAt: '2026-04-05' },
  { repoId: 'repo_002', name: 'dev', latestCommitId: 'u1v2w3x4y5', isProtected: false, createdBy: 'user_004', createdAt: '2026-04-08' },
  { repoId: 'repo_003', name: 'main', latestCommitId: 'z6a7b8c9d0', isProtected: true, createdBy: 'user_002', createdAt: '2026-04-10' }
];

const MOCK_FILES = [
  // repo_001 - main branch
  { repoId: 'repo_001', branch: 'main', path: 'src/main/java/com/example/Application.java', content: 'package com.example;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class Application {\n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n}', lastModifiedBy: 'user_003', lastModifiedAt: '2026-04-01 10:00' },
  { repoId: 'repo_001', branch: 'main', path: 'src/main/java/com/example/controller/UserController.java', content: 'package com.example.controller;\n\nimport com.example.entity.User;\nimport com.example.service.UserService;\nimport org.springframework.web.bind.annotation.*;\nimport java.util.List;\n\n@RestController\n@RequestMapping("/api/users")\npublic class UserController {\n\n    private final UserService userService;\n\n    public UserController(UserService userService) {\n        this.userService = userService;\n    }\n\n    @GetMapping\n    public List<User> getAllUsers() {\n        return userService.findAll();\n    }\n\n    @GetMapping("/{id}")\n    public User getUserById(@PathVariable Long id) {\n        return userService.findById(id);\n    }\n\n    @PostMapping\n    public User createUser(@RequestBody User user) {\n        return userService.save(user);\n    }\n\n    @PutMapping("/{id}")\n    public User updateUser(@PathVariable Long id, @RequestBody User user) {\n        user.setId(id);\n        return userService.save(user);\n    }\n\n    @DeleteMapping("/{id}")\n    public void deleteUser(@PathVariable Long id) {\n        userService.deleteById(id);\n    }\n}', lastModifiedBy: 'user_003', lastModifiedAt: '2026-04-05 14:30' },
  { repoId: 'repo_001', branch: 'main', path: 'src/main/java/com/example/entity/User.java', content: 'package com.example.entity;\n\nimport jakarta.persistence.*;\nimport java.time.LocalDateTime;\n\n@Entity\n@Table(name = "users")\npublic class User {\n\n    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private Long id;\n\n    @Column(nullable = false, unique = true, length = 50)\n    private String username;\n\n    @Column(nullable = false)\n    private String password;\n\n    @Column(nullable = false, length = 100)\n    private String name;\n\n    @Column(length = 100)\n    private String email;\n\n    @Enumerated(EnumType.STRING)\n    private UserRole role;\n\n    private LocalDateTime createdAt;\n\n    @PrePersist\n    protected void onCreate() {\n        createdAt = LocalDateTime.now();\n    }\n\n    public enum UserRole {\n        ADMIN, TEACHER, STUDENT, ENTERPRISE\n    }\n\n    // Getters and Setters\n    public Long getId() { return id; }\n    public void setId(Long id) { this.id = id; }\n    public String getUsername() { return username; }\n    public void setUsername(String username) { this.username = username; }\n    public String getPassword() { return password; }\n    public void setPassword(String password) { this.password = password; }\n    public String getName() { return name; }\n    public void setName(String name) { this.name = name; }\n    public String getEmail() { return email; }\n    public void setEmail(String email) { this.email = email; }\n    public UserRole getRole() { return role; }\n    public void setRole(UserRole role) { this.role = role; }\n}', lastModifiedBy: 'user_003', lastModifiedAt: '2026-04-03 09:15' },
  { repoId: 'repo_001', branch: 'main', path: 'src/main/java/com/example/service/UserService.java', content: 'package com.example.service;\n\nimport com.example.entity.User;\nimport com.example.repository.UserRepository;\nimport org.springframework.stereotype.Service;\nimport java.util.List;\n\n@Service\npublic class UserService {\n\n    private final UserRepository userRepository;\n\n    public UserService(UserRepository userRepository) {\n        this.userRepository = userRepository;\n    }\n\n    public List<User> findAll() {\n        return userRepository.findAll();\n    }\n\n    public User findById(Long id) {\n        return userRepository.findById(id)\n            .orElseThrow(() -> new RuntimeException("User not found"));\n    }\n\n    public User save(User user) {\n        return userRepository.save(user);\n    }\n\n    public void deleteById(Long id) {\n        userRepository.deleteById(id);\n    }\n}', lastModifiedBy: 'user_004', lastModifiedAt: '2026-04-04 16:00' },
  { repoId: 'repo_001', branch: 'main', path: 'src/main/resources/application.yml', content: 'server:\n  port: 8080\n\nspring:\n  datasource:\n    url: jdbc:mysql://localhost:3306/student_info\n    username: root\n    password: root123\n  jpa:\n    hibernate:\n      ddl-auto: update\n    show-sql: true\n\nlogging:\n  level:\n    com.example: DEBUG', lastModifiedBy: 'user_003', lastModifiedAt: '2026-04-02 11:00' },
  { repoId: 'repo_001', branch: 'main', path: 'pom.xml', content: '<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n    <modelVersion>4.0.0</modelVersion>\n    <parent>\n        <groupId>org.springframework.boot</groupId>\n        <artifactId>spring-boot-starter-parent</artifactId>\n        <version>3.2.0</version>\n    </parent>\n    <groupId>com.example</groupId>\n    <artifactId>student-info-system</artifactId>\n    <version>1.0.0</version>\n    <dependencies>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-web</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>org.springframework.boot</groupId>\n            <artifactId>spring-boot-starter-data-jpa</artifactId>\n        </dependency>\n        <dependency>\n            <groupId>com.mysql</groupId>\n            <artifactId>mysql-connector-j</artifactId>\n        </dependency>\n    </dependencies>\n</project>', lastModifiedBy: 'user_003', lastModifiedAt: '2026-03-28 10:00' },
  { repoId: 'repo_001', branch: 'main', path: 'README.md', content: '# 学生信息管理系统\n\n## 项目简介\n面向高校的学生信息管理系统，实现学生基本信息、成绩、课程等管理功能。\n\n## 技术栈\n- 后端：Spring Boot 3.2 + JPA + MySQL\n- 前端：Vue.js 3 + Element Plus\n\n## 快速开始\n```bash\n# 后端\nmvn spring-boot:run\n\n# 前端\ncd frontend-app\nnpm install\nnpm run dev\n```\n\n## 团队成员\n- 李同学 - 后端开发\n- 王同学 - 前端开发\n- 张教授 - 指导教师', lastModifiedBy: 'user_003', lastModifiedAt: '2026-03-28 10:30' },
  { repoId: 'repo_001', branch: 'main', path: 'docs/api-design.md', content: '# API 设计文档\n\n## 用户接口\n\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| GET | /api/users | 获取所有用户 |\n| GET | /api/users/:id | 获取单个用户 |\n| POST | /api/users | 创建用户 |\n| PUT | /api/users/:id | 更新用户 |\n| DELETE | /api/users/:id | 删除用户 |\n\n## 认证接口\n\n| 方法 | 路径 | 说明 |\n|------|------|------|\n| POST | /api/auth/login | 用户登录 |\n| POST | /api/auth/register | 用户注册 |', lastModifiedBy: 'user_004', lastModifiedAt: '2026-04-10 15:00' }
];

const MOCK_COMMITS = [
  { id: 1, hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', repoId: 'repo_001', branchName: 'main', message: '初始化项目结构', description: '创建Spring Boot项目，配置基础依赖和项目结构', authorId: 'user_003', parentHash: null, filesChanged: 4, additions: 120, deletions: 0, committedAt: '2026-03-28 10:00' },
  { id: 2, hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1', repoId: 'repo_001', branchName: 'main', message: '添加User实体类和基础CRUD', description: '实现User实体、Repository、Service和Controller', authorId: 'user_003', parentHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', filesChanged: 4, additions: 180, deletions: 5, committedAt: '2026-04-01 14:30' },
  { id: 3, hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2', repoId: 'repo_001', branchName: 'main', message: '完善用户服务层逻辑', description: '添加用户验证、密码加密等功能', authorId: 'user_004', parentHash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1', filesChanged: 2, additions: 45, deletions: 10, committedAt: '2026-04-04 16:00' },
  { id: 4, hash: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2c3', repoId: 'repo_001', branchName: 'main', message: '添加API设计文档', description: '编写REST API接口文档', authorId: 'user_004', parentHash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2', filesChanged: 1, additions: 30, deletions: 0, committedAt: '2026-04-10 15:00' },
  { id: 5, hash: 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2c3d4e5', repoId: 'repo_001', branchName: 'dev', message: '创建dev分支', description: '从main分支创建开发分支', authorId: 'user_003', parentHash: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2c3', filesChanged: 0, additions: 0, deletions: 0, committedAt: '2026-04-01 09:00' },
  { id: 6, hash: 'k1l2m3n4o5p6q7r8s9t0a1b2c3d4e5f6g7h8i9j0', repoId: 'repo_001', branchName: 'feature/login', message: '开始开发登录功能', description: '创建登录页面和认证控制器', authorId: 'user_004', parentHash: 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2c3d4e5', filesChanged: 2, additions: 65, deletions: 0, committedAt: '2026-04-15 10:30' },
  { id: 7, hash: 'p6q7r8s9t0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5', repoId: 'repo_002', branchName: 'main', message: '初始化前端项目', description: '使用Vite创建Vue3项目', authorId: 'user_004', parentHash: null, filesChanged: 3, additions: 85, deletions: 0, committedAt: '2026-04-05 14:00' },
  { id: 8, hash: 'z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5', repoId: 'repo_003', branchName: 'main', message: '初始化API网关', description: '配置Spring Cloud Gateway基础路由', authorId: 'user_002', parentHash: null, filesChanged: 2, additions: 55, deletions: 0, committedAt: '2026-04-10 09:00' }
];

// ==================== 仓库成员角色配置 ====================

const REPO_ROLE_CONFIG = {
  owner: { name: '所有者', color: '#ef4444', icon: 'shield', permissions: ['read', 'write', 'admin', 'delete', 'manage_members'] },
  maintainer: { name: '维护者', color: '#f59e0b', icon: 'shield-check', permissions: ['read', 'write', 'admin', 'manage_members'] },
  developer: { name: '开发者', color: '#3b82f6', icon: 'code', permissions: ['read', 'write'] },
  reporter: { name: '报告者', color: '#8b5cf6', icon: 'eye', permissions: ['read'] },
  guest: { name: '访客', color: '#6b7280', icon: 'user', permissions: ['read'] }
};

// ==================== 语言配置 ====================

const LANGUAGE_CONFIG = {
  'Java': { icon: 'coffee', color: '#ed8b00', ext: '.java' },
  'JavaScript': { icon: 'braces', color: '#f7df1e', ext: '.js' },
  'TypeScript': { icon: 'braces', color: '#3178c6', ext: '.ts' },
  'Python': { icon: 'terminal', color: '#3776ab', ext: '.py' },
  'HTML': { icon: 'code', color: '#e34f26', ext: '.html' },
  'CSS': { icon: 'paintbrush', color: '#1572b6', ext: '.css' },
  'SQL': { icon: 'database', color: '#4479a1', ext: '.sql' },
  'Markdown': { icon: 'file-text', color: '#083fa1', ext: '.md' },
  'XML': { icon: 'code', color: '#0060ac', ext: '.xml' },
  'YAML': { icon: 'settings', color: '#cb171e', ext: '.yml' }
};

// ==================== 状态管理 ====================

let codeRepoState = {
  currentView: 'list',          // list | detail | editor
  currentRepoId: null,
  currentBranch: 'main',
  currentFilePath: null,
  editorContent: '',
  editorDirty: false,
  selectedCommitId: null
};

// ==================== 数据管理扩展 ====================

function getRepoDataManager() {
  return {
    _getRepos() {
      const data = localStorage.getItem('code_repos_data');
      if (!data) {
        localStorage.setItem('code_repos_data', JSON.stringify({
          repositories: MOCK_REPOSITORIES,
          members: MOCK_REPO_MEMBERS,
          branches: MOCK_BRANCHES,
          files: MOCK_FILES,
          commits: MOCK_COMMITS
        }));
        return { repositories: MOCK_REPOSITORIES, members: MOCK_REPO_MEMBERS, branches: MOCK_BRANCHES, files: MOCK_FILES, commits: MOCK_COMMITS };
      }
      return JSON.parse(data);
    },

    _save(data) {
      localStorage.setItem('code_repos_data', JSON.stringify(data));
    },

    // ---- 仓库 ----
    getRepositories(filters = {}) {
      const d = this._getRepos();
      let repos = [...d.repositories];
      const currentUser = dataManager.getCurrentUser();

      if (filters.userId) {
        repos = repos.filter(r => {
          if (String(r.ownerId) === String(filters.userId)) return true;
          return d.members.some(m => m.repoId === r.id && String(m.userId) === String(filters.userId));
        });
      }
      if (filters.projectId) {
        repos = repos.filter(r => r.projectId === filters.projectId);
      }

      // 教师和管理员可以看所有仓库
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'teacher')) {
        return repos;
      }

      return repos;
    },

    getRepository(repoId) {
      const d = this._getRepos();
      return d.repositories.find(r => r.id === repoId);
    },

    createRepository(repoData) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      const newRepo = {
        id: 'repo_' + Date.now(),
        ...repoData,
        ownerId: currentUser.id,
        defaultBranch: 'main',
        starCount: 0,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      d.repositories.push(newRepo);
      // 使用字符串格式存储用户ID
      d.members.push({ repoId: newRepo.id, userId: String(currentUser.id), role: 'owner', invitedBy: null, createdAt: new Date().toISOString().split('T')[0] });
      d.branches.push({ repoId: newRepo.id, name: 'main', latestCommitId: null, isProtected: true, createdBy: String(currentUser.id), createdAt: new Date().toISOString().split('T')[0] });
      this._save(d);
      return newRepo;
    },

    deleteRepository(repoId) {
      const d = this._getRepos();
      d.repositories = d.repositories.filter(r => r.id !== repoId);
      d.members = d.members.filter(m => m.repoId !== repoId);
      d.branches = d.branches.filter(b => b.repoId !== repoId);
      d.files = d.files.filter(f => f.repoId !== repoId);
      d.commits = d.commits.filter(c => c.repoId !== repoId);
      this._save(d);
    },

    // ---- 成员 ----
    getMembers(repoId) {
      const d = this._getRepos();
      return d.members.filter(m => m.repoId === repoId);
    },

    addMember(repoId, userId, role) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      if (d.members.some(m => m.repoId === repoId && m.userId === userId)) {
        return { success: false, message: '该用户已是仓库成员' };
      }
      d.members.push({ repoId, userId, role, invitedBy: currentUser.id, createdAt: new Date().toISOString().split('T')[0] });
      this._save(d);
      return { success: true };
    },

    removeMember(repoId, userId) {
      const d = this._getRepos();
      d.members = d.members.filter(m => !(m.repoId === repoId && m.userId === userId));
      this._save(d);
    },

    updateMemberRole(repoId, userId, role) {
      const d = this._getRepos();
      const idx = d.members.findIndex(m => m.repoId === repoId && m.userId === userId);
      if (idx !== -1) {
        d.members[idx].role = role;
        this._save(d);
        return true;
      }
      return false;
    },

    getUserRole(repoId) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      if (!currentUser) return null;
      
      // 兼容数字和字符串类型的用户ID
      const userId = currentUser.id;
      const member = d.members.find(m => {
        if (m.repoId !== repoId) return false;
        // 比较时转换为字符串
        return String(m.userId) === String(userId);
      });
      
      return member ? member.role : null;
    },

    // ---- 分支 ----
    getBranches(repoId) {
      const d = this._getRepos();
      return d.branches.filter(b => b.repoId === repoId);
    },

    createBranch(repoId, name) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      if (d.branches.some(b => b.repoId === repoId && b.name === name)) {
        return { success: false, message: '分支已存在' };
      }
      d.branches.push({ repoId, name, latestCommitId: null, isProtected: false, createdBy: currentUser.id, createdAt: new Date().toISOString().split('T')[0] });
      this._save(d);
      return { success: true };
    },

    // ---- 文件 ----
    getFiles(repoId, branch, pathPrefix) {
      const d = this._getRepos();
      let files = d.files.filter(f => f.repoId === repoId && f.branch === branch);
      if (pathPrefix) {
        files = files.filter(f => f.path.startsWith(pathPrefix));
      }
      return files;
    },

    getFile(repoId, branch, filePath) {
      const d = this._getRepos();
      return d.files.find(f => f.repoId === repoId && f.branch === branch && f.path === filePath);
    },

    saveFile(repoId, branch, filePath, content) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      const idx = d.files.findIndex(f => f.repoId === repoId && f.branch === branch && f.path === filePath);
      if (idx !== -1) {
        d.files[idx].content = content;
        d.files[idx].lastModifiedBy = currentUser.id;
        d.files[idx].lastModifiedAt = new Date().toLocaleString();
      } else {
        d.files.push({
          repoId, branch, path: filePath,
          content,
          lastModifiedBy: currentUser.id,
          lastModifiedAt: new Date().toLocaleString()
        });
      }
      this._save(d);
    },

    deleteFile(repoId, branch, filePath) {
      const d = this._getRepos();
      d.files = d.files.filter(f => !(f.repoId === repoId && f.branch === branch && f.path === filePath));
      this._save(d);
    },

    // ---- 提交 ----
    getCommits(repoId, branchName) {
      const d = this._getRepos();
      let commits = d.commits.filter(c => c.repoId === repoId);
      if (branchName) {
        commits = commits.filter(c => c.branchName === branchName);
      }
      return commits.sort((a, b) => new Date(b.committedAt) - new Date(a.committedAt));
    },

    createCommit(repoId, branchName, message, description, changedFiles) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      const branchCommits = d.commits.filter(c => c.repoId === repoId && c.branchName === branchName);
      const parentHash = branchCommits.length > 0 ? branchCommits[branchCommits.length - 1].hash : null;

      const hash = Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

      let additions = 0, deletions = 0;
      changedFiles.forEach(f => {
        if (f.type === 'add') additions++;
        else if (f.type === 'delete') deletions++;
        else { additions++; deletions++; }
      });

      const commit = {
        id: d.commits.length + 1,
        hash,
        repoId,
        branchName,
        message,
        description,
        authorId: currentUser.id,
        parentHash,
        filesChanged: changedFiles.length,
        additions,
        deletions,
        committedAt: new Date().toLocaleString()
      };
      d.commits.push(commit);

      // 更新分支最新提交
      const branchIdx = d.branches.findIndex(b => b.repoId === repoId && b.name === branchName);
      if (branchIdx !== -1) {
        d.branches[branchIdx].latestCommitId = hash;
      }

      this._save(d);
      return commit;
    },

    getCommitDiff(commitId) {
      const d = this._getRepos();
      const commit = d.commits.find(c => c.id === commitId);
      if (!commit) return null;

      // 模拟diff：找到该提交相对于父提交的文件变化
      const repoFiles = d.files.filter(f => f.repoId === commit.repoId && f.branch === commit.branchName);
      const changedFiles = [];

      if (commit.parentHash === null) {
        // 初始提交
        repoFiles.slice(0, commit.filesChanged).forEach(f => {
          changedFiles.push({
            path: f.path,
            type: 'add',
            additions: f.content.split('\n').length,
            deletions: 0,
            content: f.content
          });
        });
      } else {
        // 模拟部分文件变更
        const sampleFiles = repoFiles.slice(0, Math.max(1, commit.filesChanged));
        sampleFiles.forEach((f, i) => {
          changedFiles.push({
            path: f.path,
            type: i % 3 === 0 ? 'modify' : 'add',
            additions: Math.floor(Math.random() * 20) + 1,
            deletions: Math.floor(Math.random() * 10),
            content: f.content
          });
        });
      }

      return { commit, files: changedFiles };
    },

    // ---- 仓库更新 ----
    updateRepository(repoId, updates) {
      const d = this._getRepos();
      const idx = d.repositories.findIndex(r => r.id === repoId);
      if (idx !== -1) {
        d.repositories[idx] = { ...d.repositories[idx], ...updates, updatedAt: new Date().toLocaleString() };
        this._save(d);
        return true;
      }
      return false;
    },

    // ---- 文件夹创建 ----
    createFolder(repoId, branch, folderPath) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      
      // 创建一个 .gitkeep 文件来表示文件夹
      const gitkeepPath = folderPath.endsWith('/') ? folderPath + '.gitkeep' : folderPath + '/.gitkeep';
      
      if (!d.files.some(f => f.repoId === repoId && f.branch === branch && f.path === gitkeepPath)) {
        d.files.push({
          repoId, branch, path: gitkeepPath,
          content: '',
          lastModifiedBy: currentUser.id,
          lastModifiedAt: new Date().toLocaleString()
        });
        this._save(d);
      }
      return true;
    },

    // ---- 批量上传文件 ----
    uploadFiles(repoId, branch, filesData) {
      const d = this._getRepos();
      const currentUser = dataManager.getCurrentUser();
      const uploadedFiles = [];

      filesData.forEach(({ path, content }) => {
        const idx = d.files.findIndex(f => f.repoId === repoId && f.branch === branch && f.path === path);
        if (idx !== -1) {
          d.files[idx].content = content;
          d.files[idx].lastModifiedBy = currentUser.id;
          d.files[idx].lastModifiedAt = new Date().toLocaleString();
        } else {
          d.files.push({
            repoId, branch, path,
            content,
            lastModifiedBy: currentUser.id,
            lastModifiedAt: new Date().toLocaleString()
          });
        }
        uploadedFiles.push({ path, type: idx !== -1 ? 'modify' : 'add' });
      });

      this._save(d);
      return uploadedFiles;
    },

    // ---- 获取仓库所有文件（用于下载） ----
    getRepoFiles(repoId, branch) {
      const d = this._getRepos();
      return d.files.filter(f => f.repoId === repoId && f.branch === branch);
    }
  };
}

const repoDataMgr = getRepoDataManager();

// ==================== 辅助函数 ====================

function getFileExtension(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.substring(dot) : '';
}

function getFileIcon(path) {
  const ext = getFileExtension(path);
  const map = {
    '.java': 'coffee', '.js': 'braces', '.ts': 'braces',
    '.py': 'terminal', '.html': 'code', '.css': 'paintbrush',
    '.sql': 'database', '.md': 'file-text', '.xml': 'code',
    '.yml': 'settings', '.yaml': 'settings', '.json': 'braces',
    '.vue': 'code', '.jsx': 'braces', '.tsx': 'braces'
  };
  return map[ext] || 'file';
}

function getFileLanguage(path) {
  const ext = getFileExtension(path);
  const map = {
    '.java': 'java', '.js': 'javascript', '.ts': 'typescript',
    '.py': 'python', '.html': 'html', '.css': 'css',
    '.sql': 'sql', '.md': 'markdown', '.xml': 'xml',
    '.yml': 'yaml', '.yaml': 'yaml', '.json': 'json'
  };
  return map[ext] || 'text';
}

function shortenHash(hash) {
  return hash ? hash.substring(0, 7) : '-';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
  return dateStr.split(' ')[0];
}

// ==================== UI 渲染：仓库列表 ====================

function renderCodeRepos() {
  const currentUser = dataManager.getCurrentUser();
  codeRepoState.currentView = 'list';
  codeRepoState.currentRepoId = null;
  codeRepoState.currentFilePath = null;
  codeRepoState.editorDirty = false;

  let repos;
  if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
    repos = repoDataMgr.getRepositories();
  } else {
    repos = repoDataMgr.getRepositories({ userId: currentUser.id });
  }

  const totalRepos = repos.length;
  const totalCommits = repos.reduce((sum, r) => sum + repoDataMgr.getCommits(r.id).length, 0);
  const myRepos = repos.filter(r => String(r.ownerId) === String(currentUser.id)).length;

  return `
    <div class="page-header">
      <h1><i data-lucide="git-branch" style="width:24px;height:24px;vertical-align:middle;margin-right:8px"></i>代码仓库</h1>
      <div class="subtitle">在线协作编码，管理项目代码版本</div>
    </div>

    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="icon blue"><i data-lucide="folder-git-2"></i></div>
        <div class="info">
          <h3>${totalRepos}</h3>
          <p>仓库总数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon green"><i data-lucide="git-commit-horizontal"></i></div>
        <div class="info">
          <h3>${totalCommits}</h3>
          <p>提交总数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon purple"><i data-lucide="user"></i></div>
        <div class="info">
          <h3>${myRepos}</h3>
          <p>我的仓库</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon orange"><i data-lucide="users"></i></div>
        <div class="info">
          <h3>${new Set(repos.map(r => r.ownerId)).size}</h3>
          <p>贡献者</p>
        </div>
      </div>
    </div>

    <div class="card mb-6">
      <div class="card-body">
        <div class="task-filters">
          <div class="search-box">
            <i data-lucide="search" class="search-icon"></i>
            <input type="text" placeholder="搜索仓库名称..." class="form-control" id="repo-search" oninput="filterRepos()">
          </div>
          <div class="filter-group">
            <select class="form-control" id="repo-lang-filter" onchange="filterRepos()">
              <option value="">所有语言</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Python">Python</option>
            </select>
            <select class="form-control" id="repo-visibility-filter" onchange="filterRepos()">
              <option value="">所有可见性</option>
              <option value="public">公开</option>
              <option value="private">私有</option>
            </select>
            <button class="btn btn-primary" onclick="showCreateRepoModal()">
              <i data-lucide="plus" style="width:16px;height:16px;margin-right:4px"></i>新建仓库
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="repo-grid" id="repo-grid">
      ${repos.map(repo => renderRepoCard(repo)).join('')}
      ${repos.length === 0 ? `
        <div class="card" style="grid-column: span 2; text-align: center; padding: 60px 20px;">
          <i data-lucide="folder-git-2" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px"></i>
          <h3 style="color:var(--text-secondary);margin-bottom:8px">暂无代码仓库</h3>
          <p style="color:var(--text-muted);margin-bottom:16px">点击上方按钮创建你的第一个代码仓库</p>
          <button class="btn btn-primary" onclick="showCreateRepoModal()">
            <i data-lucide="plus" style="width:16px;height:16px;margin-right:4px"></i>新建仓库
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderRepoCard(repo) {
  const langConf = LANGUAGE_CONFIG[repo.language] || { icon: 'code', color: '#6b7280' };
  const members = repoDataMgr.getMembers(repo.id);
  const commits = repoDataMgr.getCommits(repo.id);
  const branches = repoDataMgr.getBranches(repo.id);
  const owner = dataManager.getUserById(repo.ownerId);

  return `
    <div class="repo-card" onclick="openRepoDetail('${repo.id}')">
      <div class="repo-card-header">
        <div class="repo-card-icon" style="color:${langConf.color}">
          <i data-lucide="folder-git-2" style="width:20px;height:20px"></i>
        </div>
        <div class="repo-card-visibility ${repo.visibility}">
          ${repo.visibility === 'public' ? '<i data-lucide="globe" style="width:12px;height:12px"></i> 公开' : '<i data-lucide="lock" style="width:12px;height:12px"></i> 私有'}
        </div>
      </div>
      <h3 class="repo-card-name">${repo.name}</h3>
      <p class="repo-card-desc">${repo.description || '暂无描述'}</p>
      <div class="repo-card-meta">
        <span class="repo-card-lang">
          <span class="lang-dot" style="background:${langConf.color}"></span>
          ${repo.language || '未知'}
        </span>
        <span><i data-lucide="git-branch" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>${branches.length}</span>
        <span><i data-lucide="git-commit-horizontal" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>${commits.length}</span>
        <span><i data-lucide="users" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>${members.length}</span>
      </div>
      <div class="repo-card-footer">
        <span class="repo-card-time">更新于 ${timeAgo(repo.updatedAt)}</span>
      </div>
    </div>
  `;
}

function filterRepos() {
  const search = (document.getElementById('repo-search')?.value || '').toLowerCase();
  const lang = document.getElementById('repo-lang-filter')?.value || '';
  const vis = document.getElementById('repo-visibility-filter')?.value || '';

  document.querySelectorAll('.repo-card').forEach(card => {
    const name = card.querySelector('.repo-card-name')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.repo-card-desc')?.textContent.toLowerCase() || '';
    const langText = card.querySelector('.repo-card-lang')?.textContent.trim() || '';
    const visClass = card.querySelector('.repo-card-visibility')?.classList;

    const matchSearch = !search || name.includes(search) || desc.includes(search);
    const matchLang = !lang || langText.includes(lang);
    const matchVis = !vis || (visClass && visClass.contains(vis));

    card.style.display = (matchSearch && matchLang && matchVis) ? '' : 'none';
  });
}

// ==================== 创建仓库弹窗 ====================

function showCreateRepoModal() {
  const currentUser = dataManager.getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'error');
    return;
  }

  const projects = dataManager.getProjects();

  const content = `
    <div class="form-group">
      <label>仓库名称 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-repo-name" placeholder="例如：my-project" required>
    </div>
    <div class="form-group">
      <label>仓库描述</label>
      <textarea class="form-control" id="new-repo-desc" rows="3" placeholder="简要描述仓库用途"></textarea>
    </div>
    <div class="form-group">
      <label>主要语言</label>
      <select class="form-control" id="new-repo-lang">
        <option value="Java">Java</option>
        <option value="JavaScript">JavaScript</option>
        <option value="TypeScript">TypeScript</option>
        <option value="Python">Python</option>
        <option value="HTML">HTML</option>
      </select>
    </div>
    <div class="form-group">
      <label>可见性</label>
      <select class="form-control" id="new-repo-visibility">
        <option value="private">私有 - 仅成员可访问</option>
        <option value="public">公开 - 所有人可查看</option>
      </select>
    </div>
    ${projects.length > 0 ? `
    <div class="form-group">
      <label>关联项目</label>
      <select class="form-control" id="new-repo-project">
        <option value="">不关联</option>
        ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
    ` : ''}
  `;

  showModal('新建代码仓库', content);

  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateRepo()">创建仓库</button>
      `;
    }
    // 自动聚焦到仓库名称输入框
    const nameInput = document.getElementById('new-repo-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

function handleCreateRepo() {
  const currentUser = dataManager.getCurrentUser();
  if (!currentUser) {
    showToast('请先登录', 'error');
    return;
  }

  const name = document.getElementById('new-repo-name')?.value.trim();
  const desc = document.getElementById('new-repo-desc')?.value.trim();
  const lang = document.getElementById('new-repo-lang')?.value;
  const visibility = document.getElementById('new-repo-visibility')?.value;
  const projectId = document.getElementById('new-repo-project')?.value || null;

  if (!name) {
    showToast('请输入仓库名称', 'error');
    document.getElementById('new-repo-name')?.focus();
    return;
  }

  // 验证仓库名称格式
  if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
    showToast('仓库名称只能包含字母、数字、下划线和连字符', 'error');
    return;
  }

  try {
    const newRepo = repoDataMgr.createRepository({
      name, description: desc, language: lang, visibility, projectId
    });

    closeModal();
    showToast('仓库创建成功', 'success');
    
    // 直接打开新创建的仓库
    openRepoDetail(newRepo.id);
  } catch (error) {
    showToast('创建仓库失败：' + error.message, 'error');
  }
}

// ==================== UI 渲染：仓库详情 / 文件浏览器 ====================

function openRepoDetail(repoId) {
  codeRepoState.currentView = 'detail';
  codeRepoState.currentRepoId = repoId;
  codeRepoState.currentFilePath = null;
  codeRepoState.editorDirty = false;
  navigateTo('codeRepos');
}

function renderRepoDetail(repoId) {
  const repo = repoDataMgr.getRepository(repoId);
  if (!repo) return '<p>仓库不存在</p>';

  const branches = repoDataMgr.getBranches(repoId);
  const currentBranch = codeRepoState.currentBranch || repo.defaultBranch;
  const files = repoDataMgr.getFiles(repoId, currentBranch);
  const members = repoDataMgr.getMembers(repoId);
  const commits = repoDataMgr.getCommits(repoId, currentBranch);
  const currentUser = dataManager.getCurrentUser();
  const userRole = repoDataMgr.getUserRole(repoId);
  const canWrite = userRole && REPO_ROLE_CONFIG[userRole]?.permissions.includes('write');

  const tree = buildFileTree(files);

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <button class="btn btn-outline btn-sm" onclick="codeRepoState.currentView='list';codeRepoState.currentRepoId=null;navigateTo('codeRepos')">
          <i data-lucide="arrow-left" style="width:14px;height:14px;margin-right:4px"></i>返回
        </button>
        <h1 style="margin:0"><i data-lucide="folder-git-2" style="width:24px;height:24px;vertical-align:middle;margin-right:8px"></i>${repo.name}</h1>
        <span class="badge ${repo.visibility === 'public' ? 'badge-success' : 'badge-warning'}">${repo.visibility === 'public' ? '公开' : '私有'}</span>
      </div>
      <div class="subtitle">${repo.description || '暂无描述'}</div>
    </div>

    <div class="repo-detail-bar">
      <div class="repo-detail-left">
        <div class="branch-selector">
          <i data-lucide="git-branch" style="width:14px;height:14px"></i>
          <select class="form-control form-control-sm" onchange="switchBranch('${repoId}', this.value)" id="branch-select">
            ${branches.map(b => `<option value="${b.name}" ${b.name === currentBranch ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-outline" onclick="showCreateBranchModal('${repoId}')" title="新建分支">
            <i data-lucide="plus" style="width:12px;height:12px"></i>
          </button>
        </div>
        <span class="repo-stat"><i data-lucide="git-commit-horizontal" style="width:12px;height:12px"></i> ${commits.length} 次提交</span>
        <span class="repo-stat"><i data-lucide="git-branch" style="width:12px;height:12px"></i> ${branches.length} 个分支</span>
        <span class="repo-stat"><i data-lucide="users" style="width:12px;height:12px"></i> ${members.length} 位成员</span>
      </div>
      <div class="repo-detail-right">
        ${canWrite ? `
          <button class="btn btn-sm btn-primary" onclick="showUploadFilesModal('${repoId}')">
            <i data-lucide="upload" style="width:14px;height:14px;margin-right:4px"></i>上传文件
          </button>
          <button class="btn btn-sm btn-outline" onclick="showNewFileModal('${repoId}')">
            <i data-lucide="file-plus" style="width:14px;height:14px;margin-right:4px"></i>新建文件
          </button>
          <button class="btn btn-sm btn-outline" onclick="showNewFolderModal('${repoId}')">
            <i data-lucide="folder-plus" style="width:14px;height:14px;margin-right:4px"></i>新建文件夹
          </button>
        ` : ''}
        <button class="btn btn-sm btn-outline" onclick="downloadRepo('${repoId}')">
          <i data-lucide="download" style="width:14px;height:14px;margin-right:4px"></i>下载仓库
        </button>
        <button class="btn btn-sm btn-outline" onclick="showRepoMembersModal('${repoId}')">
          <i data-lucide="users" style="width:14px;height:14px;margin-right:4px"></i>成员管理
        </button>
        <button class="btn btn-sm btn-outline" onclick="showRepoSettingsModal('${repoId}')">
          <i data-lucide="settings" style="width:14px;height:14px;margin-right:4px"></i>设置
        </button>
      </div>
    </div>

    <div class="repo-content-layout">
      <div class="repo-sidebar">
        <div class="file-tree-header">
          <span>文件目录</span>
        </div>
        <div class="file-tree" id="file-tree">
          ${renderFileTree(tree, repoId, currentBranch)}
        </div>
      </div>
      <div class="repo-main" id="repo-main-content">
        ${codeRepoState.currentFilePath ? renderFileViewer(repoId, currentBranch, codeRepoState.currentFilePath) : renderRepoOverview(repo)}
      </div>
    </div>
  `;
}

function buildFileTree(files) {
  const tree = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    let current = tree;
    parts.forEach((part, idx) => {
      if (!current[part]) {
        current[part] = idx === parts.length - 1 ? { __file: f } : {};
      }
      if (idx < parts.length - 1) {
        current = current[part];
      }
    });
  });
  return tree;
}

function renderFileTree(tree, repoId, branch, prefix = '', depth = 0) {
  let html = '';
  const entries = Object.entries(tree).sort(([aName, aVal], [bName, bVal]) => {
    const aIsDir = !aVal.__file;
    const bIsDir = !bVal.__file;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return aName.localeCompare(bName);
  });

  entries.forEach(([name, val]) => {
    const fullPath = prefix ? `${prefix}/${name}` : name;
    const isDir = !val.__file;
    const indent = depth * 16;

    if (isDir) {
      html += `
        <div class="file-tree-item dir" style="padding-left:${indent + 8}px" 
             onclick="toggleDir(this)"
             oncontextmenu="showFileContextMenu(event, '${repoId}', '${branch}', '${fullPath}', true)">
          <i data-lucide="chevron-right" style="width:14px;height:14px;transition:transform 0.2s" class="dir-arrow"></i>
          <i data-lucide="folder" style="width:14px;height:14px;color:#3b82f6"></i>
          <span>${name}</span>
        </div>
        <div class="file-tree-children" style="display:none">
          ${renderFileTree(val, repoId, branch, fullPath, depth + 1)}
        </div>
      `;
    } else {
      if (name === '.gitkeep') return; // 隐藏 .gitkeep 文件
      html += `
        <div class="file-tree-item file ${codeRepoState.currentFilePath === fullPath ? 'active' : ''}" 
             style="padding-left:${indent + 28}px" 
             onclick="openFile('${repoId}', '${branch}', '${fullPath.replace(/'/g, "\\'")}')"
             oncontextmenu="showFileContextMenu(event, '${repoId}', '${branch}', '${fullPath}', false)">
          <i data-lucide="${getFileIcon(name)}" style="width:14px;height:14px;color:var(--text-muted)"></i>
          <span>${name}</span>
        </div>
      `;
    }
  });
  return html;
}

function toggleDir(el) {
  const children = el.nextElementSibling;
  const arrow = el.querySelector('.dir-arrow');
  if (children.style.display === 'none') {
    children.style.display = 'block';
    arrow.style.transform = 'rotate(90deg)';
  } else {
    children.style.display = 'none';
    arrow.style.transform = '';
  }
}

function openFile(repoId, branch, filePath) {
  codeRepoState.currentFilePath = filePath;
  codeRepoState.editorDirty = false;

  const repoMain = document.getElementById('repo-main-content');
  if (repoMain) {
    repoMain.innerHTML = renderFileViewer(repoId, branch, filePath);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // 更新文件树激活状态
  document.querySelectorAll('.file-tree-item.file').forEach(el => {
    el.classList.remove('active');
  });
  document.querySelectorAll('.file-tree-item.file').forEach(el => {
    if (el.onclick && el.onclick.toString().includes(filePath.replace(/'/g, "\\'"))) {
      el.classList.add('active');
    }
  });
}

// ==================== 右键菜单功能 ====================

function showFileContextMenu(event, repoId, branch, filePath, isDir) {
  event.preventDefault();
  event.stopPropagation();
  
  const userRole = repoDataMgr.getUserRole(repoId);
  const canWrite = userRole && REPO_ROLE_CONFIG[userRole]?.permissions.includes('write');
  
  // 移除已存在的菜单
  const existingMenu = document.getElementById('file-context-menu');
  if (existingMenu) existingMenu.remove();
  
  const menu = document.createElement('div');
  menu.id = 'file-context-menu';
  menu.className = 'context-menu';
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  
  let menuItems = [];
  
  if (isDir) {
    menuItems = [
      { icon: 'file-plus', label: '新建文件', action: () => showNewFileInFolder(repoId, branch, filePath) },
      { icon: 'folder-plus', label: '新建子文件夹', action: () => showNewFolderInFolder(repoId, branch, filePath) },
      { icon: 'upload', label: '上传文件到此目录', action: () => showUploadToFolder(repoId, branch, filePath) },
      { divider: true },
      { icon: 'download', label: '下载文件夹', action: () => downloadFolder(repoId, branch, filePath), disabled: true },
      { divider: true },
      { icon: 'trash-2', label: '删除文件夹', action: () => confirmDeleteFolder(repoId, branch, filePath), danger: true, disabled: !canWrite }
    ];
  } else {
    menuItems = [
      { icon: 'file-text', label: '查看文件', action: () => openFile(repoId, branch, filePath) },
      { icon: 'pencil', label: '编辑文件', action: () => openEditor(repoId, branch, filePath), disabled: !canWrite },
      { divider: true },
      { icon: 'download', label: '下载文件', action: () => downloadFile(repoId, branch, filePath) },
      { icon: 'copy', label: '复制内容', action: () => copyFileContent(repoId, branch, filePath) },
      { divider: true },
      { icon: 'trash-2', label: '删除文件', action: () => confirmDeleteFile(repoId, branch, filePath), danger: true, disabled: !canWrite }
    ];
  }
  
  menuItems.forEach(item => {
    if (item.divider) {
      const divider = document.createElement('div');
      divider.className = 'context-menu-divider';
      menu.appendChild(divider);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`;
      menuItem.innerHTML = `
        <i data-lucide="${item.icon}" style="width:14px;height:14px"></i>
        <span>${item.label}</span>
      `;
      if (!item.disabled) {
        menuItem.onclick = () => {
          closeContextMenu();
          item.action();
        };
      }
      menu.appendChild(menuItem);
    }
  });
  
  document.body.appendChild(menu);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  // 点击其他地方关闭菜单
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu);
  }, 0);
}

function closeContextMenu() {
  const menu = document.getElementById('file-context-menu');
  if (menu) menu.remove();
  document.removeEventListener('click', closeContextMenu);
}

function showNewFileInFolder(repoId, branch, folderPath) {
  const content = `
    <div class="form-group">
      <label>文件名称 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-file-in-folder-name" placeholder="例如：MyClass.java">
      <small class="text-muted">文件将创建在 ${folderPath} 目录下</small>
    </div>
  `;

  showModal('在 ' + folderPath.split('/').pop() + ' 中新建文件', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateFileInFolder('${repoId}', '${branch}', '${folderPath}')">创建并编辑</button>
      `;
    }
  }, 50);
}

function handleCreateFileInFolder(repoId, branch, folderPath) {
  const fileName = document.getElementById('new-file-in-folder-name')?.value.trim();
  if (!fileName) {
    showToast('请输入文件名称', 'error');
    return;
  }
  
  const fullPath = folderPath + '/' + fileName;
  closeModal();
  openEditor(repoId, branch, fullPath, '');
}

function showNewFolderInFolder(repoId, branch, parentPath) {
  const content = `
    <div class="form-group">
      <label>文件夹名称 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-subfolder-name" placeholder="例如：utils">
      <small class="text-muted">文件夹将创建在 ${parentPath} 目录下</small>
    </div>
  `;

  showModal('在 ' + parentPath.split('/').pop() + ' 中新建文件夹', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateSubfolder('${repoId}', '${branch}', '${parentPath}')">创建</button>
      `;
    }
  }, 50);
}

function handleCreateSubfolder(repoId, branch, parentPath) {
  const folderName = document.getElementById('new-subfolder-name')?.value.trim();
  if (!folderName) {
    showToast('请输入文件夹名称', 'error');
    return;
  }
  
  const fullPath = parentPath + '/' + folderName;
  repoDataMgr.createFolder(repoId, branch, fullPath);
  closeModal();
  showToast('文件夹创建成功', 'success');
  openRepoDetail(repoId);
}

function showUploadToFolder(repoId, branch, folderPath) {
  showUploadFilesModal(repoId);
  setTimeout(() => {
    const prefixInput = document.getElementById('upload-path-prefix');
    if (prefixInput) {
      prefixInput.value = folderPath + '/';
    }
  }, 100);
}

function confirmDeleteFolder(repoId, branch, folderPath) {
  const folderName = folderPath.split('/').pop();
  const files = repoDataMgr.getFiles(repoId, branch).filter(f => f.path.startsWith(folderPath + '/'));
  
  const content = `
    <div class="text-center">
      <i data-lucide="alert-triangle" style="width:48px;height:48px;margin-bottom:16px;color:var(--amber-500)"></i>
      <h3 class="text-xl font-bold mb-2">确认删除文件夹</h3>
      <p class="text-muted mb-4">确定要删除文件夹 <strong>${folderName}</strong> 及其所有内容吗？</p>
      <p class="text-warning">该操作将删除 ${files.length} 个文件，不可撤销</p>
    </div>
  `;

  showModal('删除确认', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="handleDeleteFolder('${repoId}', '${branch}', '${folderPath}')">确认删除</button>
      `;
    }
  }, 50);
}

function handleDeleteFolder(repoId, branch, folderPath) {
  const files = repoDataMgr.getFiles(repoId, branch).filter(f => f.path.startsWith(folderPath + '/'));
  
  files.forEach(file => {
    repoDataMgr.deleteFile(repoId, branch, file.path);
  });
  
  // 创建提交记录
  repoDataMgr.createCommit(repoId, branch, 
    `删除文件夹 ${folderPath.split('/').pop()}`, 
    `删除文件夹及其 ${files.length} 个文件`,
    files.map(f => ({ path: f.path, type: 'delete' }))
  );

  closeModal();
  showToast('文件夹已删除', 'success');
  codeRepoState.currentFilePath = null;
  openRepoDetail(repoId);
}

function renderFileViewer(repoId, branch, filePath) {
  const file = repoDataMgr.getFile(repoId, branch, filePath);
  if (!file) return '<p style="padding:20px">文件不存在</p>';

  const lang = getFileLanguage(filePath);
  const fileName = filePath.split('/').pop();
  const modifier = dataManager.getUserById(file.lastModifiedBy);
  const userRole = repoDataMgr.getUserRole(repoId);
  const canWrite = userRole && REPO_ROLE_CONFIG[userRole]?.permissions.includes('write');
  const currentUser = dataManager.getCurrentUser();
  const canReview = currentUser && (currentUser.role === 'teacher' || currentUser.role === 'enterprise' || currentUser.role === 'admin');

  return `
    <div class="file-viewer-header">
      <div class="file-viewer-path">
        ${filePath.split('/').map((p, i, arr) => `
          <span class="path-segment ${i === arr.length - 1 ? 'active' : ''}">${p}</span>
          ${i < arr.length - 1 ? '<span class="path-separator">/</span>' : ''}
        `).join('')}
      </div>
      <div class="file-viewer-actions">
        ${canWrite ? `
          <button class="btn btn-sm btn-primary" onclick="openEditor('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}')">
            <i data-lucide="pencil" style="width:14px;height:14px;margin-right:4px"></i>编辑
          </button>
        ` : ''}
        ${canReview && file.lastModifiedBy ? `
          <button class="btn btn-sm btn-warning" onclick="showCodeReviewModal('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}', '${file.lastModifiedBy}', '${modifier?.name || '未知'}')">
            <i data-lucide="message-square" style="width:14px;height:14px;margin-right:4px"></i>评审
          </button>
        ` : ''}
        <button class="btn btn-sm btn-outline" onclick="downloadFile('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}')">
          <i data-lucide="download" style="width:14px;height:14px;margin-right:4px"></i>下载
        </button>
        <button class="btn btn-sm btn-outline" onclick="copyFileContent('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}')">
          <i data-lucide="copy" style="width:14px;height:14px;margin-right:4px"></i>复制
        </button>
        ${canWrite ? `
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteFile('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}')">
            <i data-lucide="trash-2" style="width:14px;height:14px;margin-right:4px"></i>删除
          </button>
        ` : ''}
      </div>
    </div>
    <div class="file-viewer-info">
      <span><i data-lucide="user" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>${modifier?.name || '未知'}</span>
      <span><i data-lucide="clock" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>更新于 ${file.lastModifiedAt || '-'}</span>
      <span><i data-lucide="file-text" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i>${file.content.split('\n').length} 行</span>
    </div>
    <div class="code-viewer">
      <div class="code-line-numbers" id="code-line-numbers">
        ${file.content.split('\n').map((_, i) => `<div class="line-number">${i + 1}</div>`).join('')}
      </div>
      <pre class="code-content" id="code-content"><code class="language-${lang}">${escapeHtml(file.content)}</code></pre>
    </div>
  `;
}

function renderRepoOverview(repo) {
  const commits = repoDataMgr.getCommits(repo.id);
  const recentCommits = commits.slice(0, 5);
  const members = repoDataMgr.getMembers(repo.id);
  const branches = repoDataMgr.getBranches(repo.id);

  return `
    <div class="repo-overview">
      <div class="repo-overview-section">
        <h3><i data-lucide="info" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i>仓库信息</h3>
        <div class="repo-info-grid">
          <div class="repo-info-item"><span class="label">创建者</span><span class="value">${dataManager.getUserById(repo.ownerId)?.name || '-'}</span></div>
          <div class="repo-info-item"><span class="label">创建时间</span><span class="value">${repo.createdAt}</span></div>
          <div class="repo-info-item"><span class="label">主要语言</span><span class="value">${repo.language || '-'}</span></div>
          <div class="repo-info-item"><span class="label">默认分支</span><span class="value">${repo.defaultBranch}</span></div>
          <div class="repo-info-item"><span class="label">可见性</span><span class="value">${repo.visibility === 'public' ? '公开' : '私有'}</span></div>
          <div class="repo-info-item"><span class="label">星标数</span><span class="value">${repo.starCount}</span></div>
        </div>
      </div>

      <div class="repo-overview-section">
        <h3><i data-lucide="git-commit-horizontal" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i>最近提交</h3>
        ${recentCommits.length > 0 ? `
          <div class="commit-list-compact">
            ${recentCommits.map(c => {
              const author = dataManager.getUserById(c.authorId);
              return `
                <div class="commit-item-compact" onclick="showCommitDetail(${c.id})">
                  <div class="commit-avatar">${author?.name?.charAt(0) || '?'}</div>
                  <div class="commit-info-compact">
                    <div class="commit-msg">${c.message}</div>
                    <div class="commit-meta-compact">
                      <span>${author?.name || '-'}</span>
                      <span>${shortenHash(c.hash)}</span>
                      <span>${timeAgo(c.committedAt)}</span>
                      <span class="commit-changes">
                        <span class="text-green">+${c.additions}</span>
                        <span class="text-red">-${c.deletions}</span>
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button class="btn btn-sm btn-outline mt-3" onclick="showAllCommits('${repo.id}')">查看全部提交</button>
        ` : '<p class="text-muted">暂无提交记录</p>'}
      </div>

      <div class="repo-overview-section">
        <h3><i data-lucide="users" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i>成员 (${members.length})</h3>
        <div class="member-list-compact">
          ${members.slice(0, 6).map(m => {
            const user = dataManager.getUserById(m.userId);
            const roleConf = REPO_ROLE_CONFIG[m.role];
            return `
              <div class="member-item-compact">
                <div class="avatar-sm">${user?.name?.charAt(0) || '?'}</div>
                <span class="member-name">${user?.name || '-'}</span>
                <span class="badge" style="background:${roleConf?.color || '#6b7280'}20;color:${roleConf?.color || '#6b7280'};font-size:11px">${roleConf?.name || m.role}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function switchBranch(repoId, branchName) {
  codeRepoState.currentBranch = branchName;
  codeRepoState.currentFilePath = null;
  openRepoDetail(repoId);
}

function showCreateBranchModal(repoId) {
  const content = `
    <div class="form-group">
      <label>分支名称 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-branch-name" placeholder="例如：feature/user-login">
      <small class="text-muted">建议使用 feature/、bugfix/、hotfix/ 前缀</small>
    </div>
  `;
  showModal('创建新分支', content);
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateBranch('${repoId}')">创建</button>
      `;
    }
  }, 50);
}

function handleCreateBranch(repoId) {
  const name = document.getElementById('new-branch-name')?.value.trim();
  if (!name) { showToast('请输入分支名称', 'error'); return; }
  const result = repoDataMgr.createBranch(repoId, name);
  if (result.success) {
    closeModal();
    showToast('分支创建成功', 'success');
    switchBranch(repoId, name);
  } else {
    showToast(result.message, 'error');
  }
}

function showNewFileModal(repoId) {
  const branch = codeRepoState.currentBranch;
  const content = `
    <div class="form-group">
      <label>文件路径 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-file-path" placeholder="例如：src/main/java/com/example/NewFile.java">
    </div>
  `;
  showModal('新建文件', content);
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateFile('${repoId}', '${branch}')">创建并编辑</button>
      `;
    }
  }, 50);
}

function handleCreateFile(repoId, branch) {
  const filePath = document.getElementById('new-file-path')?.value.trim();
  if (!filePath) { showToast('请输入文件路径', 'error'); return; }
  closeModal();
  codeRepoState.currentFilePath = filePath;
  openEditor(repoId, branch, filePath, '');
}

// ==================== UI 渲染：在线代码编辑器 ====================

function openEditor(repoId, branch, filePath, content) {
  if (content === undefined) {
    const file = repoDataMgr.getFile(repoId, branch, filePath);
    content = file ? file.content : '';
  }
  codeRepoState.currentView = 'editor';
  codeRepoState.currentRepoId = repoId;
  codeRepoState.currentBranch = branch;
  codeRepoState.currentFilePath = filePath;
  codeRepoState.editorContent = content;
  codeRepoState.editorDirty = false;
  navigateTo('codeRepos');
}

function renderCodeEditor(repoId, branch, filePath, content) {
  const repo = repoDataMgr.getRepository(repoId);
  const fileName = filePath.split('/').pop();
  const lang = getFileLanguage(filePath);
  const lineCount = content.split('\n').length;

  return `
    <div class="editor-header">
      <div class="editor-header-left">
        <button class="btn btn-outline btn-sm" onclick="exitEditor()">
          <i data-lucide="arrow-left" style="width:14px;height:14px;margin-right:4px"></i>返回仓库
        </button>
        <div class="editor-breadcrumb">
          <span>${repo?.name || ''}</span>
          <span class="path-separator">/</span>
          ${filePath.split('/').map((p, i, arr) => `
            <span class="${i === arr.length - 1 ? 'active' : ''}">${p}</span>
            ${i < arr.length - 1 ? '<span class="path-separator">/</span>' : ''}
          `).join('')}
        </div>
      </div>
      <div class="editor-header-right">
        <span class="editor-status" id="editor-status">
          <span class="status-dot clean"></span> 已保存
        </span>
        <span class="editor-lang">${lang}</span>
        <span class="editor-lines">${lineCount} 行</span>
        <button class="btn btn-sm btn-outline" onclick="editorUndo()">
          <i data-lucide="undo-2" style="width:14px;height:14px"></i>
        </button>
        <button class="btn btn-sm btn-outline" onclick="editorRedo()">
          <i data-lucide="redo-2" style="width:14px;height:14px"></i>
        </button>
        <button class="btn btn-sm btn-primary" onclick="saveCurrentFile()" id="editor-save-btn">
          <i data-lucide="save" style="width:14px;height:14px;margin-right:4px"></i>保存
        </button>
        <button class="btn btn-sm btn-success" onclick="showCommitModal()">
          <i data-lucide="git-commit-horizontal" style="width:14px;height:14px;margin-right:4px"></i>提交
        </button>
      </div>
    </div>
    <div class="editor-container">
      <div class="editor-line-numbers" id="editor-line-numbers">
        ${content.split('\n').map((_, i) => `<div class="line-number">${i + 1}</div>`).join('')}
      </div>
      <textarea class="editor-textarea" id="editor-textarea" spellcheck="false"
        oninput="onEditorInput()"
        onscroll="syncScroll()"
        onkeydown="handleEditorKeydown(event)"
      >${escapeHtml(content)}</textarea>
      <div class="editor-minimap" id="editor-minimap">
        <pre class="minimap-content">${escapeHtml(content)}</pre>
        <div class="minimap-viewport" id="minimap-viewport"></div>
      </div>
    </div>
    <div class="editor-footer">
      <div class="editor-footer-left">
        <span>分支: ${branch}</span>
        <span>编码: UTF-8</span>
        <span>缩进: 4空格</span>
      </div>
      <div class="editor-footer-right">
        <span id="editor-cursor-pos">行 1, 列 1</span>
      </div>
    </div>
  `;
}

let editorUndoStack = [];
let editorRedoStack = [];

function onEditorInput() {
  const textarea = document.getElementById('editor-textarea');
  if (!textarea) return;

  editorUndoStack.push(codeRepoState.editorContent);
  editorRedoStack = [];
  codeRepoState.editorContent = textarea.value;
  codeRepoState.editorDirty = true;

  updateLineNumbers();
  updateEditorStatus();
  updateMinimap();
}

function updateLineNumbers() {
  const textarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  if (!textarea || !lineNumbers) return;

  const lines = textarea.value.split('\n');
  lineNumbers.innerHTML = lines.map((_, i) => `<div class="line-number">${i + 1}</div>`).join('');
}

function updateEditorStatus() {
  const status = document.getElementById('editor-status');
  if (status) {
    status.innerHTML = codeRepoState.editorDirty
      ? '<span class="status-dot dirty"></span> 未保存'
      : '<span class="status-dot clean"></span> 已保存';
  }
}

function updateMinimap() {
  const textarea = document.getElementById('editor-textarea');
  const minimap = document.querySelector('.minimap-content');
  if (textarea && minimap) {
    minimap.textContent = textarea.value;
  }
}

function syncScroll() {
  const textarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  const minimapViewport = document.getElementById('minimap-viewport');
  if (textarea && lineNumbers) {
    lineNumbers.scrollTop = textarea.scrollTop;
  }
  if (textarea && minimapViewport) {
    const ratio = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1);
    const minimapHeight = document.getElementById('editor-minimap')?.clientHeight || 300;
    minimapViewport.style.top = (ratio * minimapHeight) + 'px';
  }
}

function handleEditorKeydown(event) {
  if (event.key === 'Tab') {
    event.preventDefault();
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 4;
    onEditorInput();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    saveCurrentFile();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    editorUndo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault();
    editorRedo();
  }

  // 更新光标位置
  setTimeout(() => {
    updateCursorPosition(event.target);
  }, 0);
}

function updateCursorPosition(textarea) {
  const pos = document.getElementById('editor-cursor-pos');
  if (!pos || !textarea) return;
  const text = textarea.value.substring(0, textarea.selectionStart);
  const lines = text.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  pos.textContent = `行 ${line}, 列 ${col}`;
}

function editorUndo() {
  if (editorUndoStack.length === 0) return;
  editorRedoStack.push(codeRepoState.editorContent);
  codeRepoState.editorContent = editorUndoStack.pop();
  const textarea = document.getElementById('editor-textarea');
  if (textarea) {
    textarea.value = codeRepoState.editorContent;
    updateLineNumbers();
    updateMinimap();
  }
  codeRepoState.editorDirty = true;
  updateEditorStatus();
}

function editorRedo() {
  if (editorRedoStack.length === 0) return;
  editorUndoStack.push(codeRepoState.editorContent);
  codeRepoState.editorContent = editorRedoStack.pop();
  const textarea = document.getElementById('editor-textarea');
  if (textarea) {
    textarea.value = codeRepoState.editorContent;
    updateLineNumbers();
    updateMinimap();
  }
  codeRepoState.editorDirty = true;
  updateEditorStatus();
}

function saveCurrentFile() {
  const { currentRepoId, currentBranch, currentFilePath, editorContent } = codeRepoState;
  if (!currentRepoId || !currentBranch || !currentFilePath) return;

  repoDataMgr.saveFile(currentRepoId, currentBranch, currentFilePath, editorContent);
  codeRepoState.editorDirty = false;
  updateEditorStatus();
  showToast('文件已保存', 'success');
}

function exitEditor() {
  if (codeRepoState.editorDirty) {
    if (!confirm('当前文件有未保存的修改，确定要离开吗？')) return;
  }
  codeRepoState.currentView = 'detail';
  codeRepoState.editorDirty = false;
  navigateTo('codeRepos');
}

function copyFileContent(repoId, branch, filePath) {
  const file = repoDataMgr.getFile(repoId, branch, filePath);
  if (file) {
    navigator.clipboard.writeText(file.content).then(() => {
      showToast('代码已复制到剪贴板', 'success');
    }).catch(() => {
      showToast('复制失败', 'error');
    });
  }
}

// ==================== UI 渲染：提交 ====================

function showCommitModal() {
  const content = `
    <div class="form-group">
      <label>提交信息 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="commit-message" placeholder="简要描述本次修改">
    </div>
    <div class="form-group">
      <label>详细描述</label>
      <textarea class="form-control" id="commit-description" rows="3" placeholder="可选：详细说明修改内容"></textarea>
    </div>
    <div class="commit-preview" style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:12px;margin-top:8px">
      <div style="font-weight:600;margin-bottom:8px">变更文件</div>
      <div style="display:flex;align-items:center;gap:8px">
        <i data-lucide="${getFileIcon(codeRepoState.currentFilePath)}" style="width:14px;height:14px"></i>
        <span>${codeRepoState.currentFilePath}</span>
        <span class="badge badge-warning" style="font-size:10px">已修改</span>
      </div>
    </div>
  `;

  showModal('提交更改', content);

  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-success" onclick="handleCommit()">确认提交</button>
      `;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 50);
}

function handleCommit() {
  const message = document.getElementById('commit-message')?.value.trim();
  const description = document.getElementById('commit-description')?.value.trim();

  if (!message) {
    showToast('请输入提交信息', 'error');
    return;
  }

  // 先保存文件
  saveCurrentFile();

  const { currentRepoId, currentBranch, currentFilePath } = codeRepoState;
  const branches = repoDataMgr.getBranches(currentRepoId);
  const branch = branches.find(b => b.name === currentBranch);

  if (!branch) {
    showToast('分支不存在', 'error');
    return;
  }

  repoDataMgr.createCommit(currentRepoId, currentBranch, message, description, [
    { path: currentFilePath, type: 'modify' }
  ]);

  closeModal();
  showToast('提交成功', 'success');
}

// ==================== UI 渲染：提交历史 ====================

function showAllCommits(repoId) {
  codeRepoState.currentView = 'commits';
  codeRepoState.currentRepoId = repoId;
  navigateTo('codeRepos');
}

function renderCommitsView(repoId) {
  const repo = repoDataMgr.getRepository(repoId);
  if (!repo) return '<p>仓库不存在</p>';

  const commits = repoDataMgr.getCommits(repoId);

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <button class="btn btn-outline btn-sm" onclick="codeRepoState.currentView='detail';navigateTo('codeRepos')">
          <i data-lucide="arrow-left" style="width:14px;height:14px;margin-right:4px"></i>返回仓库
        </button>
        <h1 style="margin:0"><i data-lucide="git-commit-horizontal" style="width:24px;height:24px;vertical-align:middle;margin-right:8px"></i>提交历史 - ${repo.name}</h1>
      </div>
      <div class="subtitle">共 ${commits.length} 次提交</div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        ${commits.length > 0 ? `
          <div class="commit-timeline">
            ${commits.map((c, idx) => {
              const author = dataManager.getUserById(c.authorId);
              const isLast = idx === commits.length - 1;
              return `
                <div class="commit-timeline-item" onclick="showCommitDetail(${c.id})">
                  <div class="commit-timeline-dot ${isLast ? 'last' : ''}">
                    <div class="commit-dot"></div>
                    ${!isLast ? '<div class="commit-line"></div>' : ''}
                  </div>
                  <div class="commit-timeline-content">
                    <div class="commit-timeline-header">
                      <div class="commit-avatar">${author?.name?.charAt(0) || '?'}</div>
                      <div class="commit-timeline-info">
                        <div class="commit-timeline-msg">${c.message}</div>
                        <div class="commit-timeline-meta">
                          <span class="commit-author">${author?.name || '-'}</span>
                          <span>提交于 ${c.committedAt}</span>
                          <span class="commit-hash" title="${c.hash}">${shortenHash(c.hash)}</span>
                        </div>
                      </div>
                      <div class="commit-timeline-stats">
                        <span class="text-green">+${c.additions}</span>
                        <span class="text-red">-${c.deletions}</span>
                        <span>${c.filesChanged} 文件</span>
                      </div>
                    </div>
                    ${c.description ? `<div class="commit-timeline-desc">${c.description}</div>` : ''}
                    <div class="commit-timeline-branch">
                      <i data-lucide="git-branch" style="width:12px;height:12px"></i>
                      ${c.branchName}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:60px 20px">
            <i data-lucide="git-commit-horizontal" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px"></i>
            <h3 style="color:var(--text-secondary)">暂无提交记录</h3>
            <p style="color:var(--text-muted)">编辑文件后提交即可看到历史记录</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function showCommitDetail(commitId) {
  const diff = repoDataMgr.getCommitDiff(commitId);
  if (!diff) { showToast('提交不存在', 'error'); return; }

  const { commit, files } = diff;
  const author = dataManager.getUserById(commit.authorId);

  const content = `
    <div class="commit-detail">
      <div class="commit-detail-header">
        <h3>${commit.message}</h3>
        ${commit.description ? `<p class="text-muted">${commit.description}</p>` : ''}
        <div class="commit-detail-meta">
          <div class="commit-avatar">${author?.name?.charAt(0) || '?'}</div>
          <span><strong>${author?.name || '-'}</strong></span>
          <span>提交于 ${commit.committedAt}</span>
          <span class="commit-hash" title="${commit.hash}">${shortenHash(commit.hash)}</span>
        </div>
        <div class="commit-detail-stats">
          <span class="text-green">+${commit.additions} 新增</span>
          <span class="text-red">-${commit.deletions} 删除</span>
          <span>${commit.filesChanged} 文件变更</span>
        </div>
      </div>

      <div class="commit-diff-files">
        <h4 style="margin-bottom:12px">变更文件</h4>
        ${files.map(f => `
          <div class="diff-file">
            <div class="diff-file-header">
              <i data-lucide="${getFileIcon(f.path)}" style="width:14px;height:14px"></i>
              <span class="diff-file-path">${f.path}</span>
              <span class="diff-file-stats">
                <span class="text-green">+${f.additions}</span>
                <span class="text-red">-${f.deletions}</span>
              </span>
              <span class="badge badge-${f.type === 'add' ? 'success' : f.type === 'delete' ? 'danger' : 'warning'}" style="font-size:10px">
                ${f.type === 'add' ? '新增' : f.type === 'delete' ? '删除' : '修改'}
              </span>
            </div>
            <div class="diff-content">
              <pre class="diff-code">${escapeHtml(f.content)}</pre>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  showModal('提交详情 - ' + shortenHash(commit.hash), content);
}

// ==================== UI 渲染：成员管理 ====================

function showRepoMembersModal(repoId) {
  const members = repoDataMgr.getMembers(repoId);
  const repo = repoDataMgr.getRepository(repoId);
  const currentUser = dataManager.getCurrentUser();
  const userRole = repoDataMgr.getUserRole(repoId);
  const canManage = userRole && REPO_ROLE_CONFIG[userRole]?.permissions.includes('manage_members');

  const content = `
    <div class="members-management">
      ${canManage ? `
      <div class="add-member-section" style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-default)">
        <div style="display:flex;gap:8px">
          <select class="form-control" id="add-member-select" style="flex:1">
            <option value="">选择用户...</option>
            ${dataManager.getUsers().filter(u => !members.some(m => m.userId === u.id)).map(u => `
              <option value="${u.id}">${u.name} (${u.username})</option>
            `).join('')}
          </select>
          <select class="form-control" id="add-member-role" style="width:120px">
            <option value="developer">开发者</option>
            <option value="maintainer">维护者</option>
            <option value="reporter">报告者</option>
            <option value="guest">访客</option>
          </select>
          <button class="btn btn-primary" onclick="handleAddMember('${repoId}')">添加</button>
        </div>
      </div>
      ` : ''}

      <div class="members-list">
        ${members.map(m => {
          const user = dataManager.getUserById(m.userId);
          const roleConf = REPO_ROLE_CONFIG[m.role];
          const isOwner = m.role === 'owner';
          const isSelf = m.userId === currentUser.id;

          return `
            <div class="member-row">
              <div class="member-avatar">${user?.name?.charAt(0) || '?'}</div>
              <div class="member-info">
                <div class="member-name">${user?.name || '-'} ${isSelf ? '<span class="badge badge-primary" style="font-size:10px">你</span>' : ''}</div>
                <div class="member-email">${user?.email || user?.username || ''}</div>
              </div>
              <div class="member-role">
                ${canManage && !isOwner && !isSelf ? `
                  <select class="form-control form-control-sm" onchange="handleUpdateMemberRole('${repoId}', '${m.userId}', this.value)" style="width:100px">
                    ${Object.entries(REPO_ROLE_CONFIG).filter(([k]) => k !== 'owner').map(([k, v]) => `
                      <option value="${k}" ${k === m.role ? 'selected' : ''}>${v.name}</option>
                    `).join('')}
                  </select>
                ` : `
                  <span class="badge" style="background:${roleConf?.color || '#6b7280'}20;color:${roleConf?.color || '#6b7280'}">
                    ${roleConf?.name || m.role}
                  </span>
                `}
              </div>
              <div class="member-actions">
                ${canManage && !isOwner && !isSelf ? `
                  <button class="btn btn-sm btn-danger" onclick="handleRemoveMember('${repoId}', '${m.userId}')" title="移除成员">
                    <i data-lucide="user-minus" style="width:14px;height:14px"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  showModal(`${repo?.name || ''} - 成员管理`, content);
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) footer.innerHTML = '<button class="btn btn-outline" onclick="closeModal()">关闭</button>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 50);
}

function handleAddMember(repoId) {
  const userId = document.getElementById('add-member-select')?.value;
  const role = document.getElementById('add-member-role')?.value;
  if (!userId) { showToast('请选择用户', 'error'); return; }

  const result = repoDataMgr.addMember(repoId, userId, role);
  if (result.success) {
    showToast('成员添加成功', 'success');
    closeModal();
    showRepoMembersModal(repoId);
  } else {
    showToast(result.message, 'error');
  }
}

function handleRemoveMember(repoId, userId) {
  if (!confirm('确定要移除该成员吗？')) return;
  repoDataMgr.removeMember(repoId, userId);
  showToast('成员已移除', 'success');
  closeModal();
  showRepoMembersModal(repoId);
}

function handleUpdateMemberRole(repoId, userId, role) {
  repoDataMgr.updateMemberRole(repoId, userId, role);
  showToast('角色已更新', 'success');
}

// ==================== 主渲染入口 ====================

function renderCodeRepoPage() {
  if (codeRepoState.currentView === 'editor') {
    return renderCodeEditor(
      codeRepoState.currentRepoId,
      codeRepoState.currentBranch,
      codeRepoState.currentFilePath,
      codeRepoState.editorContent
    );
  }
  if (codeRepoState.currentView === 'detail') {
    return renderRepoDetail(codeRepoState.currentRepoId);
  }
  if (codeRepoState.currentView === 'commits') {
    return renderCommitsView(codeRepoState.currentRepoId);
  }
  return renderCodeRepos();
}

// ==================== 工具函数 ====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 文件上传功能 ====================

function showUploadFilesModal(repoId) {
  const branch = codeRepoState.currentBranch;
  const content = `
    <div class="upload-zone" id="upload-zone" 
         ondrop="handleFileDrop(event)" 
         ondragover="handleDragOver(event)" 
         ondragleave="handleDragLeave(event)">
      <div class="upload-icon">
        <i data-lucide="upload-cloud" style="width:48px;height:48px;color:var(--text-muted)"></i>
      </div>
      <p class="upload-text">拖拽文件到此处上传</p>
      <p class="upload-hint">或者点击下方按钮选择文件</p>
      <input type="file" id="file-input" multiple style="display:none" onchange="handleFileSelect(event)">
      <button class="btn btn-primary" onclick="document.getElementById('file-input').click()">
        <i data-lucide="folder-open" style="width:16px;height:16px;margin-right:4px"></i>选择文件
      </button>
    </div>
    <div class="upload-path-prefix">
      <label>上传路径前缀（可选）</label>
      <input type="text" class="form-control" id="upload-path-prefix" placeholder="例如：src/main/java/com/example/">
      <small class="text-muted">文件将上传到此路径下，留空则上传到根目录</small>
    </div>
    <div id="upload-file-list" class="upload-file-list"></div>
  `;

  showModal('上传文件到 ' + branch + ' 分支', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="upload-btn" onclick="handleUploadFiles('${repoId}', '${branch}')" disabled>上传文件</button>
      `;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 50);
}

let pendingUploadFiles = [];

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('upload-zone')?.classList.add('drag-over');
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('upload-zone')?.classList.remove('drag-over');
}

function handleFileDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('upload-zone')?.classList.remove('drag-over');
  
  const files = Array.from(event.dataTransfer.files);
  processSelectedFiles(files);
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processSelectedFiles(files);
}

function processSelectedFiles(files) {
  pendingUploadFiles = [];
  const fileList = document.getElementById('upload-file-list');
  if (!fileList) return;

  let html = '<div class="upload-files-header"><span>已选择 ' + files.length + ' 个文件</span></div>';
  
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      pendingUploadFiles.push({
        name: file.name,
        path: file.name,
        content: e.target.result,
        size: file.size
      });
      
      // 更新显示
      html += `
        <div class="upload-file-item" id="upload-file-${index}">
          <i data-lucide="${getFileIcon(file.name)}" style="width:16px;height:16px"></i>
          <span class="upload-file-name">${file.name}</span>
          <span class="upload-file-size">${formatFileSize(file.size)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeUploadFile(${index})">
            <i data-lucide="x" style="width:12px;height:12px"></i>
          </button>
        </div>
      `;
      fileList.innerHTML = html;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      
      // 启用上传按钮
      const uploadBtn = document.getElementById('upload-btn');
      if (uploadBtn) uploadBtn.disabled = false;
    };
    reader.readAsText(file);
  });
}

function removeUploadFile(index) {
  pendingUploadFiles.splice(index, 1);
  const fileList = document.getElementById('upload-file-list');
  if (fileList) {
    const item = document.getElementById(`upload-file-${index}`);
    if (item) item.remove();
  }
  
  if (pendingUploadFiles.length === 0) {
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) uploadBtn.disabled = true;
  }
}

function handleUploadFiles(repoId, branch) {
  if (pendingUploadFiles.length === 0) {
    showToast('请选择要上传的文件', 'error');
    return;
  }

  const pathPrefix = document.getElementById('upload-path-prefix')?.value.trim() || '';
  
  const filesData = pendingUploadFiles.map(f => ({
    path: pathPrefix ? pathPrefix + f.path : f.path,
    content: f.content
  }));

  const uploadedFiles = repoDataMgr.uploadFiles(repoId, branch, filesData);
  
  // 创建提交记录
  repoDataMgr.createCommit(repoId, branch, 
    `上传 ${uploadedFiles.length} 个文件`, 
    `上传文件：${uploadedFiles.map(f => f.path).join(', ')}`,
    uploadedFiles
  );

  pendingUploadFiles = [];
  closeModal();
  showToast(`成功上传 ${uploadedFiles.length} 个文件`, 'success');
  
  // 刷新页面
  openRepoDetail(repoId);
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 文件删除功能 ====================

function confirmDeleteFile(repoId, branch, filePath) {
  const fileName = filePath.split('/').pop();
  const content = `
    <div class="text-center">
      <i data-lucide="alert-triangle" style="width:48px;height:48px;margin-bottom:16px;color:var(--amber-500)"></i>
      <h3 class="text-xl font-bold mb-2">确认删除文件</h3>
      <p class="text-muted mb-4">确定要删除文件 <strong>${fileName}</strong> 吗？</p>
      <p class="text-warning">此操作不可撤销</p>
    </div>
  `;

  showModal('删除确认', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="handleDeleteFile('${repoId}', '${branch}', '${filePath.replace(/'/g, "\\'")}')">确认删除</button>
      `;
    }
  }, 50);
}

function handleDeleteFile(repoId, branch, filePath) {
  repoDataMgr.deleteFile(repoId, branch, filePath);
  
  // 创建提交记录
  repoDataMgr.createCommit(repoId, branch, 
    `删除文件 ${filePath.split('/').pop()}`, 
    `删除文件：${filePath}`,
    [{ path: filePath, type: 'delete' }]
  );

  closeModal();
  showToast('文件已删除', 'success');
  
  // 返回仓库详情
  codeRepoState.currentFilePath = null;
  openRepoDetail(repoId);
}

// ==================== 文件下载功能 ====================

function downloadFile(repoId, branch, filePath) {
  const file = repoDataMgr.getFile(repoId, branch, filePath);
  if (!file) {
    showToast('文件不存在', 'error');
    return;
  }

  const blob = new Blob([file.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('文件下载已开始', 'success');
}

function downloadRepo(repoId) {
  const repo = repoDataMgr.getRepository(repoId);
  if (!repo) {
    showToast('仓库不存在', 'error');
    return;
  }

  const branch = codeRepoState.currentBranch || repo.defaultBranch;
  const files = repoDataMgr.getRepoFiles(repoId, branch);
  
  if (files.length === 0) {
    showToast('仓库为空，没有文件可下载', 'warning');
    return;
  }

  // 创建一个简单的文本打包（实际项目中应使用JSZip库）
  let content = `仓库: ${repo.name}\n分支: ${branch}\n导出时间: ${new Date().toLocaleString()}\n\n`;
  content += '='.repeat(80) + '\n\n';
  
  files.forEach(file => {
    if (file.path.endsWith('.gitkeep')) return; // 跳过 .gitkeep 文件
    content += `文件: ${file.path}\n`;
    content += '-'.repeat(40) + '\n';
    content += file.content + '\n\n';
    content += '='.repeat(80) + '\n\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${repo.name}-${branch}-export.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('仓库导出已开始', 'success');
}

// ==================== 文件夹创建功能 ====================

function showNewFolderModal(repoId) {
  const branch = codeRepoState.currentBranch;
  const content = `
    <div class="form-group">
      <label>文件夹路径 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-control" id="new-folder-path" placeholder="例如：src/main/java/com/example/utils">
      <small class="text-muted">将创建指定路径的文件夹</small>
    </div>
  `;

  showModal('新建文件夹', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleCreateFolder('${repoId}', '${branch}')">创建</button>
      `;
    }
  }, 50);
}

function handleCreateFolder(repoId, branch) {
  const folderPath = document.getElementById('new-folder-path')?.value.trim();
  if (!folderPath) {
    showToast('请输入文件夹路径', 'error');
    return;
  }

  repoDataMgr.createFolder(repoId, branch, folderPath);
  
  closeModal();
  showToast('文件夹创建成功', 'success');
  
  // 刷新页面
  openRepoDetail(repoId);
}

// ==================== 仓库设置功能 ====================

function showRepoSettingsModal(repoId) {
  const repo = repoDataMgr.getRepository(repoId);
  if (!repo) {
    showToast('仓库不存在', 'error');
    return;
  }

  const userRole = repoDataMgr.getUserRole(repoId);
  const canEdit = userRole && (userRole === 'owner' || userRole === 'maintainer');

  if (!canEdit) {
    showToast('您没有权限修改仓库设置', 'error');
    return;
  }

  const content = `
    <form id="repo-settings-form">
      <div class="form-group">
        <label>仓库名称 <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-control" id="repo-settings-name" value="${repo.name}" required>
      </div>
      <div class="form-group">
        <label>仓库描述</label>
        <textarea class="form-control" id="repo-settings-desc" rows="3">${repo.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>主要语言</label>
        <select class="form-control" id="repo-settings-lang">
          ${Object.keys(LANGUAGE_CONFIG).map(lang => `
            <option value="${lang}" ${repo.language === lang ? 'selected' : ''}>${lang}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>可见性</label>
        <select class="form-control" id="repo-settings-visibility">
          <option value="private" ${repo.visibility === 'private' ? 'selected' : ''}>私有 - 仅成员可访问</option>
          <option value="public" ${repo.visibility === 'public' ? 'selected' : ''}>公开 - 所有人可查看</option>
        </select>
      </div>
      <div class="form-group">
        <label>默认分支</label>
        <input type="text" class="form-control" id="repo-settings-branch" value="${repo.defaultBranch}" readonly>
        <small class="text-muted">默认分支不可修改</small>
      </div>
      <div class="danger-zone" style="margin-top:24px;padding:16px;border:1px solid var(--danger);border-radius:var(--radius-md)">
        <h4 style="color:var(--danger);margin-bottom:8px">危险操作</h4>
        <p class="text-muted" style="margin-bottom:12px">删除仓库将永久删除所有代码、提交记录和成员信息，此操作不可撤销。</p>
        <button type="button" class="btn btn-danger" onclick="confirmDeleteRepo('${repoId}')">
          <i data-lucide="trash-2" style="width:14px;height:14px;margin-right:4px"></i>删除仓库
        </button>
      </div>
    </form>
  `;

  showModal('仓库设置 - ' + repo.name, content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="handleSaveRepoSettings('${repoId}')">保存设置</button>
      `;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 50);
}

function handleSaveRepoSettings(repoId) {
  const name = document.getElementById('repo-settings-name')?.value.trim();
  const description = document.getElementById('repo-settings-desc')?.value.trim();
  const language = document.getElementById('repo-settings-lang')?.value;
  const visibility = document.getElementById('repo-settings-visibility')?.value;

  if (!name) {
    showToast('仓库名称不能为空', 'error');
    return;
  }

  repoDataMgr.updateRepository(repoId, {
    name,
    description,
    language,
    visibility
  });

  closeModal();
  showToast('仓库设置已保存', 'success');
  
  // 刷新页面
  openRepoDetail(repoId);
}

function confirmDeleteRepo(repoId) {
  const repo = repoDataMgr.getRepository(repoId);
  if (!repo) return;

  const content = `
    <div class="text-center">
      <i data-lucide="alert-triangle" style="width:48px;height:48px;margin-bottom:16px;color:var(--danger)"></i>
      <h3 class="text-xl font-bold mb-2">确认删除仓库</h3>
      <p class="text-muted mb-4">确定要删除仓库 <strong>${repo.name}</strong> 吗？</p>
      <p class="text-danger font-semibold">此操作将永久删除所有数据，不可撤销！</p>
      <div class="form-group" style="margin-top:16px">
        <label>请输入仓库名称 <strong>${repo.name}</strong> 以确认删除</label>
        <input type="text" class="form-control" id="confirm-repo-name" placeholder="输入仓库名称">
      </div>
    </div>
  `;

  showModal('删除仓库确认', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-danger" onclick="handleDeleteRepo('${repoId}', '${repo.name}')">确认删除</button>
      `;
    }
  }, 50);
}

function handleDeleteRepo(repoId, repoName) {
  const confirmName = document.getElementById('confirm-repo-name')?.value.trim();
  if (confirmName !== repoName) {
    showToast('请输入正确的仓库名称以确认删除', 'error');
    return;
  }

  repoDataMgr.deleteRepository(repoId);
  closeModal();
  showToast('仓库已删除', 'success');
  
  // 返回仓库列表
  codeRepoState.currentView = 'list';
  codeRepoState.currentRepoId = null;
  navigateTo('codeRepos');
}
