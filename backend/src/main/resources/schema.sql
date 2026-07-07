-- ========================================
-- 软件实训全流程管理与评价系统 - 数据库初始化脚本
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS training_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE training_system;

-- ========================================
-- 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    role ENUM('ADMIN', 'TEACHER', 'STUDENT', 'ENTERPRISE') NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    student_id VARCHAR(50),
    company VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 项目表
-- ========================================
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    start_date DATE,
    end_date DATE,
    status ENUM('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') DEFAULT 'PLANNING',
    current_phase ENUM('INITIALIZATION', 'REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'TESTING', 'DEPLOYMENT', 'MAINTENANCE') DEFAULT 'INITIALIZATION',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 任务表
-- ========================================
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_id BIGINT,
    assigned_to BIGINT,
    created_by BIGINT NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    due_date DATE,
    started_at DATETIME,
    completed_at DATETIME,
    estimated_hours INT,
    actual_hours INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_project (project_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 工作记录表
-- ========================================
CREATE TABLE IF NOT EXISTS work_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    project_id BIGINT,
    task_id BIGINT,
    date DATE NOT NULL,
    duration DOUBLE,
    content TEXT,
    issues TEXT,
    plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    INDEX idx_user (user_id),
    INDEX idx_project (project_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 评价表
-- ========================================
CREATE TABLE IF NOT EXISTS evaluations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id BIGINT NOT NULL,
    evaluatee_id BIGINT NOT NULL,
    project_id BIGINT,
    task_id BIGINT,
    type ENUM('TEACHER', 'ENTERPRISE', 'PEER') NOT NULL,
    tech_score INT,
    teamwork_score INT,
    document_score INT,
    innovation_score INT,
    attitude_score INT,
    total_score DOUBLE,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluator_id) REFERENCES users(id),
    FOREIGN KEY (evaluatee_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    INDEX idx_evaluatee (evaluatee_id),
    INDEX idx_evaluator (evaluator_id),
    INDEX idx_project (project_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 通知表
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type ENUM('TASK', 'EVALUATION', 'SYSTEM', 'PROJECT') NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 实训材料表
-- ========================================
CREATE TABLE IF NOT EXISTS training_materials (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    material_type ENUM('CODE', 'DOCUMENT', 'DESIGN', 'TEST', 'OTHER') NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(50),
    file_path VARCHAR(500),
    version INT DEFAULT 1,
    status ENUM('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    submitted_by BIGINT NOT NULL,
    task_id BIGINT,
    ai_score INT,
    ai_feedback TEXT,
    reviewed_by BIGINT,
    reviewed_at DATETIME,
    review_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    INDEX idx_submitted_by (submitted_by),
    INDEX idx_task (task_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- AI评审记录表
-- ========================================
CREATE TABLE IF NOT EXISTS ai_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    material_id BIGINT NOT NULL,
    score INT,
    feedback TEXT,
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES training_materials(id),
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 代码仓库表
-- ========================================
CREATE TABLE IF NOT EXISTS code_repositories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id BIGINT,
    created_by BIGINT NOT NULL,
    url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 仓库分支表
-- ========================================
CREATE TABLE IF NOT EXISTS repo_branches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repository_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES code_repositories(id),
    INDEX idx_repository (repository_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 仓库提交表
-- ========================================
CREATE TABLE IF NOT EXISTS repo_commits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repository_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    commit_hash VARCHAR(40) NOT NULL,
    message TEXT,
    author_id BIGINT,
    committed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES code_repositories(id),
    FOREIGN KEY (branch_id) REFERENCES repo_branches(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_repository (repository_id),
    INDEX idx_branch (branch_id),
    INDEX idx_commit_hash (commit_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 仓库文件表
-- ========================================
CREATE TABLE IF NOT EXISTS repo_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repository_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    path VARCHAR(500) NOT NULL,
    name VARCHAR(200) NOT NULL,
    type ENUM('FILE', 'DIRECTORY') NOT NULL,
    content LONGTEXT,
    size BIGINT,
    last_commit_id BIGINT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES code_repositories(id),
    FOREIGN KEY (branch_id) REFERENCES repo_branches(id),
    FOREIGN KEY (last_commit_id) REFERENCES repo_commits(id),
    INDEX idx_repository (repository_id),
    INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 仓库成员表
-- ========================================
CREATE TABLE IF NOT EXISTS repo_members (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repository_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') DEFAULT 'MEMBER',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES code_repositories(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_repo_user (repository_id, user_id),
    INDEX idx_repository (repository_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- 初始化数据
-- ========================================

-- 插入用户数据（密码使用BCrypt加密）
-- admin123 -> $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH
-- teacher123 -> $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH
-- student123 -> $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH
-- enterprise123 -> $2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH

INSERT INTO users (username, password, name, role, email, phone, department, company) VALUES
('admin', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '系统管理员', 'ADMIN', 'admin@training.com', '13800000000', '系统管理部', NULL),
('teacher01', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '张老师', 'TEACHER', 'teacher@training.com', '13800000001', '软件工程系', NULL),
('student01', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '李同学', 'STUDENT', 'student@training.com', '13800000002', '软件工程系', NULL),
('enterprise01', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '王工程师', 'ENTERPRISE', 'enterprise@training.com', '13800000003', '技术研发部', '北京软通动力教育科技有限公司');

-- 插入项目数据
INSERT INTO projects (name, description, created_by, start_date, end_date, status, current_phase) VALUES
('软件实训管理平台开发', '开发一套覆盖软件实训全流程的管理与评价系统', 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 MONTH), 'IN_PROGRESS', 'DEVELOPMENT');

-- 插入任务数据
INSERT INTO tasks (title, description, created_by, assigned_to, project_id, status, priority, due_date, started_at, estimated_hours) VALUES
('需求分析文档编写', '完成软件实训管理系统的需求分析文档', 2, 3, 1, 'IN_PROGRESS', 'HIGH', DATE_ADD(CURDATE(), INTERVAL 2 WEEK), NOW(), 20),
('系统设计文档编写', '完成系统的架构设计和数据库设计', 2, 3, 1, 'PENDING', 'MEDIUM', DATE_ADD(CURDATE(), INTERVAL 4 WEEK), NULL, 30),
('前端界面开发', '完成系统前端界面的开发工作', 2, 3, 1, 'PENDING', 'HIGH', DATE_ADD(CURDATE(), INTERVAL 8 WEEK), NULL, 80);

-- 插入评价数据
INSERT INTO evaluations (evaluator_id, evaluatee_id, project_id, type, tech_score, teamwork_score, document_score, innovation_score, attitude_score, total_score, comment) VALUES
(2, 3, 1, 'TEACHER', 85, 90, 80, 75, 95, 85.5, '工作态度认真，团队协作能力强，技术能力有待提高。'),
(4, 3, 1, 'ENTERPRISE', 80, 85, 75, 70, 90, 80.0, '具备良好的职业素养，能够按时完成任务，建议加强创新能力。');

-- 插入工作记录数据
INSERT INTO work_records (user_id, project_id, task_id, date, duration, content, issues, plan) VALUES
(3, 1, 1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 4.0, '完成了需求分析文档的初稿编写，包括功能需求和非功能需求。', '对部分业务流程理解不够深入。', '与教师沟通，确认业务流程细节。'),
(3, 1, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 3.5, '根据教师反馈修改了需求分析文档，补充了用例图。', '无。', '开始系统设计文档的编写。'),
(3, 1, NULL, CURDATE(), 5.0, '学习了系统架构设计方法，开始编写系统设计文档。', '对数据库设计规范不够熟悉。', '继续完善数据库设计，参考相关规范文档。');

-- 插入通知数据
INSERT INTO notifications (user_id, type, title, content, is_read) VALUES
(3, 'TASK', '新任务分配', '您有一个新任务：需求分析文档编写，请尽快查看。', FALSE),
(3, 'EVALUATION', '收到新评价', '您收到了一条来自张老师的评价，得分：85.5分。', FALSE),
(3, 'SYSTEM', '系统公告', '欢迎使用软件实训全流程管理与评价系统！如有问题请联系管理员。', TRUE);
