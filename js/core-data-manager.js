/**
 * 核心数据管理器 - 统一管理所有数据的增删改查
 * 确保数据持久化到 localStorage
 */

class CoreDataManager {
  constructor() {
    this.storageKey = 'training_system_data';
    this.init();
  }

  init() {
    var data = localStorage.getItem(this.storageKey);
    if (!data) {
      this.resetToDefault();
      return;
    }
    // 版本检查：如果数据版本较旧，强制更新
    try {
      var parsed = JSON.parse(data);
      if (!parsed.tasks || parsed.tasks.length === 0 || !parsed.evaluations || parsed.evaluations.length === 0) {
        this.resetToDefault();
      }
    } catch(e) {
      this.resetToDefault();
    }
  }

  resetToDefault() {
    const defaultData = {
      users: [
        { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', role: 'ADMIN', email: 'admin@training.com', phone: '13800000001', department: '系统管理部', createdAt: '2026-01-01 00:00:00' },
        { id: 2, username: 'teacher01', password: 'teacher123', name: '张老师', role: 'TEACHER', email: 'teacher@training.com', phone: '13800000002', department: '软件工程系', createdAt: '2026-01-15 10:00:00' },
        { id: 3, username: 'student01', password: 'student123', name: '李同学', role: 'STUDENT', email: 'student@training.com', phone: '13800000003', department: '软件工程2022级', studentId: '2022001', createdAt: '2026-02-01 09:00:00' },
        { id: 4, username: 'student02', password: 'student123', name: '王同学', role: 'STUDENT', email: 'wang@training.com', phone: '13800000004', department: '软件工程2022级', studentId: '2022002', createdAt: '2026-02-01 09:00:00' },
        { id: 5, username: 'enterprise01', password: 'enterprise123', name: '赵工程师', role: 'ENTERPRISE', email: 'enterprise@training.com', phone: '13800000005', department: '技术研发部', company: '北京软通动力教育科技有限公司', createdAt: '2026-02-15 14:00:00' }
      ],
      projects: [
        { id: 1, name: '软件实训管理平台开发', description: '开发一套覆盖软件实训全流程的管理与评价系统', createdById: 1, startDate: '2026-03-01', endDate: '2026-06-30', status: 'IN_PROGRESS', currentPhase: 'CODING', createdAt: '2026-03-01 09:00:00' }
      ],
      tasks: [
        { id: 't1', title: '需求分析文档编写', description: '完成软件实训管理系统的需求分析，输出需求规格说明书', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'COMPLETED', priority: 'high', phase: 'REQUIREMENT', dueDate: '2026-03-10', startDate: '2026-03-01', completedDate: '2026-03-08', comments: [], attachments: [] },
        { id: 't2', title: '系统架构设计', description: '设计系统整体架构，包括前后端分层、数据库设计、API接口规划', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'COMPLETED', priority: 'high', phase: 'DESIGN', dueDate: '2026-03-20', startDate: '2026-03-11', completedDate: '2026-03-18', comments: [], attachments: [] },
        { id: 't3', title: '数据库ER图设计', description: '设计完整的数据库表结构和关系，输出ER图', projectId: 1, creatorId: 2, assigneeId: 4, assignerId: 2, status: 'COMPLETED', priority: 'medium', phase: 'DESIGN', dueDate: '2026-03-22', startDate: '2026-03-15', completedDate: '2026-03-20', comments: [], attachments: [] },
        { id: 't4', title: '用户管理模块开发', description: '实现用户注册、登录、角色权限管理功能', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'COMPLETED', priority: 'high', phase: 'CODING', dueDate: '2026-04-05', startDate: '2026-03-25', completedDate: '2026-04-03', comments: [], attachments: [] },
        { id: 't5', title: '任务管理模块开发', description: '实现任务创建、分配、提交、审核流程', projectId: 1, creatorId: 2, assigneeId: 4, assignerId: 2, status: 'COMPLETED', priority: 'high', phase: 'CODING', dueDate: '2026-04-15', startDate: '2026-04-01', completedDate: '2026-04-12', comments: [], attachments: [] },
        { id: 't6', title: '评价系统开发', description: '实现多维度评价、雷达图展示、评分计算', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'COMPLETED', priority: 'medium', phase: 'CODING', dueDate: '2026-04-25', startDate: '2026-04-10', completedDate: '2026-04-22', comments: [], attachments: [] },
        { id: 't7', title: '数据可视化开发', description: '集成Chart.js和ECharts，实现仪表盘图表展示', projectId: 1, creatorId: 2, assigneeId: 4, assignerId: 2, status: 'COMPLETED', priority: 'medium', phase: 'CODING', dueDate: '2026-05-05', startDate: '2026-04-20', completedDate: '2026-05-02', comments: [], attachments: [] },
        { id: 't8', title: 'AI评审功能开发', description: '接入DeepSeek API，实现代码智能评审', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'IN_PROGRESS', priority: 'high', phase: 'CODING', dueDate: '2026-05-20', startDate: '2026-05-03', comments: [], attachments: [] },
        { id: 't9', title: '前端界面优化', description: '优化UI样式，统一青瓷主题配色，提升用户体验', projectId: 1, creatorId: 2, assigneeId: 4, assignerId: 2, status: 'IN_PROGRESS', priority: 'low', phase: 'CODING', dueDate: '2026-05-25', startDate: '2026-05-10', comments: [], attachments: [] },
        { id: 't10', title: '系统集成测试', description: '编写测试用例，进行全功能回归测试', projectId: 1, creatorId: 2, assigneeId: 3, assignerId: 2, status: 'PENDING', priority: 'medium', phase: 'TESTING', dueDate: '2026-06-05', comments: [], attachments: [] },
        { id: 't11', title: '性能优化与部署', description: '优化系统性能，编写部署文档，准备上线', projectId: 1, creatorId: 2, assigneeId: 4, assignerId: 2, status: 'PENDING', priority: 'medium', phase: 'DEPLOYMENT', dueDate: '2026-06-20', comments: [], attachments: [] }
      ],
      records: [
        { id: 'r1', userId: 3, projectId: 1, title: '需求分析', content: '完成了需求分析文档的撰写，包括功能需求和非功能需求。与指导教师确认了需求边界。', date: '2026-03-05', duration: 4, createdAt: '2026-03-05 17:00:00' },
        { id: 'r2', userId: 3, projectId: 1, title: '系统设计', content: '完成了系统架构设计，确定了前后端技术栈：Spring Boot + HTML/CSS/JS。设计了数据库ER图。', date: '2026-03-15', duration: 6, createdAt: '2026-03-15 18:00:00' },
        { id: 'r3', userId: 4, projectId: 1, title: '数据库设计', content: '完成了8张核心表的数据库设计，包括users、tasks、evaluations、records等。编写了建表SQL。', date: '2026-03-19', duration: 5, createdAt: '2026-03-19 17:30:00' },
        { id: 'r4', userId: 3, projectId: 1, title: '用户模块开发', content: '完成了用户管理模块的前后端开发，包括注册登录、JWT认证、角色权限控制。', date: '2026-04-02', duration: 8, createdAt: '2026-04-02 19:00:00' },
        { id: 'r5', userId: 4, projectId: 1, title: '任务模块开发', content: '完成了任务管理模块，支持创建、分配、提交、审核全流程。实现了看板和列表双视图。', date: '2026-04-10', duration: 7, createdAt: '2026-04-10 18:00:00' },
        { id: 'r6', userId: 3, projectId: 1, title: '评价系统开发', content: '实现了多维度评价功能，集成雷达图展示。教师、导师、自评三种评价方式。', date: '2026-04-20', duration: 6, createdAt: '2026-04-20 17:00:00' },
        { id: 'r7', userId: 4, projectId: 1, title: '数据可视化', content: '集成了Chart.js和ECharts，实现了仪表盘的数据可视化展示。', date: '2026-05-01', duration: 5, createdAt: '2026-05-01 17:30:00' },
        { id: 'r8', userId: 3, projectId: 1, title: 'AI集成', content: '开始接入DeepSeek API，实现代码智能评审功能。处理API调用和降级策略。', date: '2026-05-08', duration: 6, createdAt: '2026-05-08 18:30:00' },
        { id: 'r9', userId: 4, projectId: 1, title: '界面优化', content: '优化了前端UI，统一了青瓷主题配色，改进了用户交互体验。', date: '2026-05-15', duration: 4, createdAt: '2026-05-15 17:00:00' },
        { id: 'r10', userId: 3, projectId: 1, title: 'AI评审调试', content: '调试AI评审功能，优化Prompt，提升评审准确性。添加了审查标准管理功能。', date: '2026-05-22', duration: 5, createdAt: '2026-05-22 18:00:00' }
      ],
      evaluations: [
        { id: 'e1', evaluateeId: 3, evaluatorId: 2, projectId: 1, type: 'TEACHER', totalScore: 88, dimensionScores: { 'code_quality': 85, 'documentation': 90, 'teamwork': 88, 'innovation': 82, 'presentation': 95 }, content: '李同学在项目中表现优秀，代码质量高，文档规范。', createdAt: '2026-04-15' },
        { id: 'e2', evaluateeId: 4, evaluatorId: 2, projectId: 1, type: 'TEACHER', totalScore: 82, dimensionScores: { 'code_quality': 80, 'documentation': 85, 'teamwork': 78, 'innovation': 85, 'presentation': 82 }, content: '王同学创新能力突出，在数据库设计方面表现良好。', createdAt: '2026-04-15' },
        { id: 'e3', evaluateeId: 3, evaluatorId: 5, projectId: 1, type: 'ENTERPRISE', totalScore: 90, dimensionScores: { 'code_quality': 92, 'documentation': 88, 'teamwork': 90, 'innovation': 85, 'presentation': 95 }, content: '代码质量达到企业标准，沟通能力强。', createdAt: '2026-05-20' },
        { id: 'e4', evaluateeId: 4, evaluatorId: 5, projectId: 1, type: 'ENTERPRISE', totalScore: 85, dimensionScores: { 'code_quality': 83, 'documentation': 87, 'teamwork': 85, 'innovation': 90, 'presentation': 80 }, content: '技术基础扎实，在AI集成方面表现出色。', createdAt: '2026-05-20' },
        { id: 'e5', evaluateeId: 3, evaluatorId: 3, projectId: 1, type: 'SELF', totalScore: 85, dimensionScores: { 'code_quality': 82, 'documentation': 88, 'teamwork': 85, 'innovation': 80, 'presentation': 90 }, content: '项目完成度较高，在AI评审集成方面还需改进。', createdAt: '2026-05-25' },
        { id: 'e6', evaluateeId: 4, evaluatorId: 4, projectId: 1, type: 'SELF', totalScore: 80, dimensionScores: { 'code_quality': 78, 'documentation': 82, 'teamwork': 80, 'innovation': 85, 'presentation': 75 }, content: '基本完成开发任务，前端优化还需进一步完善。', createdAt: '2026-05-25' }
      ],
      notifications: [
        { id: 'n1', userId: 3, title: '新任务分配', content: '教师张老师给你分配了新任务：AI评审功能开发', type: 'TASK', isRead: false, createdAt: '2026-05-03 10:00:00' },
        { id: 'n2', userId: 3, title: '评价完成', content: '企业导师赵工程师完成了对你的评价，得分90分', type: 'EVALUATION', isRead: false, createdAt: '2026-05-20 14:30:00' },
        { id: 'n3', userId: 4, title: '评价完成', content: '教师张老师完成了对你的评价，得分82分', type: 'EVALUATION', isRead: true, createdAt: '2026-04-15 16:00:00' },
        { id: 'n4', userId: 3, title: '任务即将到期', content: '任务"AI评审功能开发"将在3天后到期', type: 'TASK', isRead: false, createdAt: '2026-05-17 09:00:00' },
        { id: 'n5', userId: 4, title: '代码审查通过', content: '提交的"数据可视化开发"代码审查通过', type: 'REVIEW', isRead: true, createdAt: '2026-05-03 11:00:00' }
      ],
      activities: [
        { id: 'a1', userId: 3, type: 'task_complete', title: '完成了任务：用户管理模块开发', createdAt: '2026-04-03 17:00:00' },
        { id: 'a2', userId: 4, type: 'task_complete', title: '完成了任务：任务管理模块开发', createdAt: '2026-04-12 18:00:00' },
        { id: 'a3', userId: 2, type: 'evaluation', title: '完成了对李同学和王同学的评价', createdAt: '2026-04-15 16:00:00' },
        { id: 'a4', userId: 5, type: 'evaluation', title: '企业导师完成了学生评价', createdAt: '2026-05-20 14:30:00' },
        { id: 'a5', userId: 3, type: 'record', title: '李同学提交了AI集成工作记录', createdAt: '2026-05-08 18:30:00' }
      ],
      reviews: [],
      comments: [],
      materials: [],
      codeRepos: { repositories: [], members: [], branches: [], files: [], commits: [] },
      reviewCriteria: [
        { id: 'c1', name: '命名规范', description: '变量、方法、类名符合命名规范', weight: 25, createdBy: 1, createdAt: '2026-03-01' },
        { id: 'c2', name: '注释完整性', description: '关键方法有注释说明，复杂逻辑有解释', weight: 20, createdBy: 1, createdAt: '2026-03-01' },
        { id: 'c3', name: '异常处理', description: '正确处理异常，避免程序崩溃', weight: 25, createdBy: 1, createdAt: '2026-03-01' },
        { id: 'c4', name: '代码复用', description: '避免重复代码，合理抽象公共逻辑', weight: 15, createdBy: 1, createdAt: '2026-03-01' },
        { id: 'c5', name: '安全性', description: '无SQL注入、XSS等安全漏洞', weight: 15, createdBy: 1, createdAt: '2026-03-01' }
      ],
      codeSubmissions: [],
      settings: {
        systemName: '软件实训全流程管理与评价系统',
        version: '2.0',
        theme: 'light',
        language: 'zh',
        fontSize: 'medium',
        density: 'normal'
      }
    };
    localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
  }

  getData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('数据解析错误:', e);
      this.resetToDefault();
      return JSON.parse(localStorage.getItem(this.storageKey));
    }
  }

  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('数据保存错误:', e);
      return false;
    }
  }

  // ==================== 用户管理 ====================
  
  getUsers() {
    const data = this.getData();
    return data.users.map(u => {
      const { password, ...user } = u;
      return user;
    });
  }

  getUserById(userId) {
    if (!userId) return null;
    const data = this.getData();
    const user = data.users.find(u => String(u.id) === String(userId));
    if (user) {
      const { password, ...userInfo } = user;
      return userInfo;
    }
    return null;
  }

  getUserByUsername(username) {
    const data = this.getData();
    return data.users.find(u => u.username === username);
  }

  createUser(userData) {
    const data = this.getData();
    
    // 检查用户名是否已存在
    if (data.users.some(u => u.username === userData.username)) {
      return { success: false, message: '用户名已存在' };
    }

    const newUser = {
      id: 'user_' + Date.now(),
      ...userData,
      createdAt: new Date().toLocaleString()
    };
    data.users.push(newUser);
    this.saveData(data);
    
    const { password, ...userInfo } = newUser;
    return { success: true, data: userInfo };
  }

  updateUser(userId, updates) {
    const data = this.getData();
    const index = data.users.findIndex(u => String(u.id) === String(userId));
    if (index === -1) return { success: false, message: '用户不存在' };

    // 如果更新用户名，检查是否重复
    if (updates.username && updates.username !== data.users[index].username) {
      if (data.users.some(u => u.username === updates.username)) {
        return { success: false, message: '用户名已存在' };
      }
    }

    data.users[index] = { ...data.users[index], ...updates };
    this.saveData(data);
    
    const { password, ...userInfo } = data.users[index];
    return { success: true, data: userInfo };
  }

  deleteUser(userId) {
    const data = this.getData();
    data.users = data.users.filter(u => String(u.id) !== String(userId));
    this.saveData(data);
    return { success: true };
  }

  resetPassword(userId, newPassword = '123456') {
    const data = this.getData();
    const index = data.users.findIndex(u => String(u.id) === String(userId));
    if (index === -1) return { success: false, message: '用户不存在' };

    data.users[index].password = newPassword;
    this.saveData(data);
    return { success: true, message: `密码已重置为: ${newPassword}` };
  }

  resetUserPassword(userId, newPassword = '123456') {
    return this.resetPassword(userId, newPassword);
  }

  // ==================== 认证管理 ====================

  login(username, password) {
    const data = this.getData();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (!user) {
      return { success: false, message: '用户名或密码错误' };
    }

    const { password: _, ...userInfo } = user;
    localStorage.setItem('currentUser', JSON.stringify(userInfo));
    localStorage.setItem('authToken', 'token_' + Date.now());
    
    return { success: true, data: userInfo };
  }

  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem('currentUser');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  isLoggedIn() {
    return !!this.getCurrentUser();
  }

  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const permissions = {
      ADMIN: ['user_manage', 'task_manage', 'task_create', 'task_assign', 'task_view', 'task_submit', 'record_view', 'record_create', 'record_edit', 'evaluate_manage', 'evaluate_create', 'evaluate_score', 'evaluate_view', 'system_config', 'data_export', 'repo_manage'],
      TEACHER: ['task_create', 'task_assign', 'task_view', 'record_view', 'evaluate_create', 'evaluate_score', 'data_export', 'repo_manage'],
      STUDENT: ['task_view', 'task_submit', 'record_create', 'record_edit', 'evaluate_view', 'repo_view'],
      ENTERPRISE: ['task_view', 'record_view', 'evaluate_create', 'evaluate_score', 'repo_view']
    };

    return permissions[user.role]?.includes(permission) || false;
  }

  getRoleName(role) {
    const roleNames = {
      ADMIN: '系统管理员',
      TEACHER: '指导教师',
      STUDENT: '学生',
      ENTERPRISE: '企业导师'
    };
    return roleNames[role] || role;
  }

  // ==================== 任务管理 ====================

  getTasks(filters = {}) {
    const data = this.getData();
    let tasks = [...data.tasks];

    if (filters.projectId) {
      tasks = tasks.filter(t => t.projectId === filters.projectId);
    }
    if (filters.assigneeId) {
      tasks = tasks.filter(t => String(t.assigneeId) === String(filters.assigneeId));
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.phase) {
      tasks = tasks.filter(t => t.phase === filters.phase);
    }
    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getTaskById(taskId) {
    const data = this.getData();
    return data.tasks.find(t => String(t.id) === String(taskId));
  }

  createTask(taskData) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();

    const newTask = {
      id: 'task_' + Date.now(),
      ...taskData,
      status: 'pending',
      createdById: currentUser.id,
      createdByName: currentUser.name,
      comments: [],
      attachments: [],
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString()
    };
    data.tasks.push(newTask);
    this.saveData(data);

    // 发送通知给负责人
    if (taskData.assigneeId && String(taskData.assigneeId) !== String(currentUser.id)) {
      this.createNotification({
        userId: taskData.assigneeId,
        type: 'task_assigned',
        title: '新任务分配',
        content: `${currentUser.name} 分配了新任务给您: ${taskData.title}`,
        relatedId: newTask.id,
        relatedType: 'task'
      });
    }

    // 记录活动
    this.createActivity({
      type: 'task_created',
      userId: currentUser.id,
      userName: currentUser.name,
      description: `创建了任务: ${taskData.title}`,
      relatedId: newTask.id
    });

    return { success: true, data: newTask };
  }

  updateTask(taskId, updates) {
    const data = this.getData();
    const index = data.tasks.findIndex(t => String(t.id) === String(taskId));
    if (index === -1) return { success: false, message: '任务不存在' };

    data.tasks[index] = { ...data.tasks[index], ...updates, updatedAt: new Date().toLocaleString() };
    this.saveData(data);
    return { success: true, data: data.tasks[index] };
  }

  updateTaskStatus(taskId, newStatus, comment) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    const index = data.tasks.findIndex(t => String(t.id) === String(taskId));
    if (index === -1) return { success: false, message: '任务不存在' };

    const task = data.tasks[index];
    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toLocaleString();

    if (newStatus === 'completed' || newStatus === 'approved') {
      task.completedDate = new Date().toLocaleString();
    }

    // 添加状态变更评论
    if (comment) {
      task.comments.push({
        id: 'comment_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        content: comment,
        type: 'status_change',
        createdAt: new Date().toLocaleString()
      });
    }

    this.saveData(data);

    // 发送通知给任务创建者
    if (String(task.createdById) !== String(currentUser.id)) {
      const statusText = {
        'in_progress': '开始处理',
        'submitted': '提交审核',
        'approved': '审核通过',
        'rejected': '审核驳回',
        'completed': '已完成'
      };

      this.createNotification({
        userId: task.createdById,
        type: 'task_status_changed',
        title: '任务状态变更',
        content: `${currentUser.name} 将任务 "${task.title}" 的状态变更为: ${statusText[newStatus] || newStatus}`,
        relatedId: taskId,
        relatedType: 'task'
      });
    }

    // 记录活动
    this.createActivity({
      type: 'task_updated',
      userId: currentUser.id,
      userName: currentUser.name,
      description: `更新了任务状态: ${task.title} -> ${newStatus}`,
      relatedId: taskId
    });

    return { success: true, data: task };
  }

  deleteTask(taskId) {
    const data = this.getData();
    data.tasks = data.tasks.filter(t => String(t.id) !== String(taskId));
    this.saveData(data);
    return { success: true };
  }

  addTaskComment(taskId, content) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    const index = data.tasks.findIndex(t => String(t.id) === String(taskId));
    if (index === -1) return { success: false, message: '任务不存在' };

    const comment = {
      id: 'comment_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: content,
      createdAt: new Date().toLocaleString()
    };

    data.tasks[index].comments.push(comment);
    data.tasks[index].updatedAt = new Date().toLocaleString();
    this.saveData(data);

    // 通知任务相关人员
    const task = data.tasks[index];
    const notifyUsers = new Set();
    if (String(task.createdById) !== String(currentUser.id)) notifyUsers.add(task.createdById);
    if (String(task.assigneeId) !== String(currentUser.id)) notifyUsers.add(task.assigneeId);

    notifyUsers.forEach(userId => {
      this.createNotification({
        userId: userId,
        type: 'comment_added',
        title: '新评论',
        content: `${currentUser.name} 在任务 "${task.title}" 中添加了评论`,
        relatedId: taskId,
        relatedType: 'task'
      });
    });

    return { success: true, data: comment };
  }

  getTaskStatistics(projectId) {
    const tasks = this.getTasks(projectId ? { projectId } : {});
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const submitted = tasks.filter(t => t.status === 'submitted').length;
    const rejected = tasks.filter(t => t.status === 'rejected').length;

    return {
      total,
      completed,
      inProgress,
      pending,
      submitted,
      rejected,
      completionRate: total > 0 ? Math.round(completed / total * 100) : 0
    };
  }

  // ==================== 过程记录 ====================

  getRecords(filters = {}) {
    const data = this.getData();
    let records = [...(data.records || [])];

    if (filters.userId) {
      records = records.filter(r => String(r.userId) === String(filters.userId));
    }
    if (filters.projectId) {
      records = records.filter(r => r.projectId === filters.projectId);
    }
    if (filters.taskId) {
      records = records.filter(r => r.taskId === filters.taskId);
    }

    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getRecordById(recordId) {
    const data = this.getData();
    return (data.records || []).find(r => String(r.id) === String(recordId));
  }

  createRecord(recordData) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();

    if (!data.records) data.records = [];

    const newRecord = {
      id: 'record_' + Date.now(),
      ...recordData,
      userId: currentUser.id,
      userName: currentUser.name,
      createdAt: new Date().toLocaleString()
    };
    data.records.push(newRecord);
    this.saveData(data);

    // 记录活动
    this.createActivity({
      type: 'record_created',
      userId: currentUser.id,
      userName: currentUser.name,
      description: `创建了工作记录: ${recordData.date}`,
      relatedId: newRecord.id
    });

    return { success: true, data: newRecord };
  }

  updateRecord(recordId, updates) {
    const data = this.getData();
    if (!data.records) data.records = [];
    
    const index = data.records.findIndex(r => String(r.id) === String(recordId));
    if (index === -1) return { success: false, message: '记录不存在' };

    data.records[index] = { ...data.records[index], ...updates };
    this.saveData(data);
    return { success: true, data: data.records[index] };
  }

  deleteRecord(recordId) {
    const data = this.getData();
    if (!data.records) data.records = [];
    
    data.records = data.records.filter(r => String(r.id) !== String(recordId));
    this.saveData(data);
    return { success: true };
  }

  // ==================== 评价系统 ====================

  getEvaluations(filters = {}) {
    const data = this.getData();
    let evaluations = [...(data.evaluations || [])];

    if (filters.evaluateeId) {
      evaluations = evaluations.filter(e => String(e.evaluateeId) === String(filters.evaluateeId));
    }
    if (filters.evaluatorId) {
      evaluations = evaluations.filter(e => String(e.evaluatorId) === String(filters.evaluatorId));
    }
    if (filters.projectId) {
      evaluations = evaluations.filter(e => e.projectId === filters.projectId);
    }
    if (filters.type) {
      evaluations = evaluations.filter(e => e.type === filters.type);
    }

    return evaluations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getEvaluationById(evalId) {
    const data = this.getData();
    return (data.evaluations || []).find(e => String(e.id) === String(evalId));
  }

  createEvaluation(evalData) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();

    if (!data.evaluations) data.evaluations = [];

    // 计算总分
    const dimensions = evalData.dimensions || {};
    const dimensionConfig = {
      technical: { weight: 0.3 },
      teamwork: { weight: 0.2 },
      document: { weight: 0.2 },
      innovation: { weight: 0.15 },
      attitude: { weight: 0.15 }
    };

    let totalScore = 0;
    Object.entries(dimensions).forEach(([key, score]) => {
      totalScore += score * (dimensionConfig[key]?.weight || 0.2);
    });
    totalScore = Math.round(totalScore);

    const newEval = {
      id: 'eval_' + Date.now(),
      ...evalData,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      totalScore: totalScore,
      createdAt: new Date().toLocaleString()
    };
    data.evaluations.push(newEval);
    this.saveData(data);

    // 发送通知给被评价人
    if (evalData.evaluateeId && String(evalData.evaluateeId) !== String(currentUser.id)) {
      this.createNotification({
        userId: evalData.evaluateeId,
        type: 'evaluation_received',
        title: '收到新评价',
        content: `${currentUser.name} 对您提交了评价，得分: ${totalScore}`,
        relatedId: newEval.id,
        relatedType: 'evaluation'
      });
    }

    // 记录活动
    this.createActivity({
      type: 'evaluation_submitted',
      userId: currentUser.id,
      userName: currentUser.name,
      description: `提交了评价，得分: ${totalScore}`,
      relatedId: newEval.id
    });

    return { success: true, data: newEval };
  }

  calculateStudentScore(studentId, projectId) {
    const evaluations = this.getEvaluations({ evaluateeId: studentId, projectId });
    if (evaluations.length === 0) return 0;

    const typeScores = {};
    evaluations.forEach(e => {
      if (!typeScores[e.type]) typeScores[e.type] = [];
      typeScores[e.type].push(e.totalScore);
    });

    const weights = { teacher: 0.4, enterprise: 0.4, peer: 0.2 };
    let finalScore = 0;
    let totalWeight = 0;

    Object.entries(typeScores).forEach(([type, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const weight = weights[type] || 0.2;
      finalScore += avg * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(finalScore / totalWeight) : 0;
  }

  // ==================== 通知系统 ====================

  getNotifications(userId) {
    const data = this.getData();
    return (data.notifications || [])
      .filter(n => String(n.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getUnreadCount(userId) {
    const data = this.getData();
    return (data.notifications || [])
      .filter(n => String(n.userId) === String(userId) && !n.read)
      .length;
  }

  createNotification(notifData) {
    const data = this.getData();
    if (!data.notifications) data.notifications = [];

    const notification = {
      id: 'notif_' + Date.now(),
      ...notifData,
      read: false,
      createdAt: new Date().toLocaleString()
    };
    data.notifications.push(notification);
    this.saveData(data);

    // 更新角标
    this.updateNotificationBadge(notifData.userId);

    return notification;
  }

  markNotificationRead(notifId) {
    const data = this.getData();
    const index = (data.notifications || []).findIndex(n => n.id === notifId);
    if (index !== -1) {
      data.notifications[index].read = true;
      this.saveData(data);
      this.updateNotificationBadge(data.notifications[index].userId);
      return { success: true };
    }
    return { success: false };
  }

  markAllNotificationsRead(userId) {
    const data = this.getData();
    (data.notifications || []).forEach(n => {
      if (String(n.userId) === String(userId)) {
        n.read = true;
      }
    });
    this.saveData(data);
    this.updateNotificationBadge(userId);
    return { success: true };
  }

  deleteNotification(notifId) {
    const data = this.getData();
    const notif = (data.notifications || []).find(n => n.id === notifId);
    data.notifications = (data.notifications || []).filter(n => n.id !== notifId);
    this.saveData(data);
    if (notif) this.updateNotificationBadge(notif.userId);
    return { success: true };
  }

  clearAllNotifications(userId) {
    const data = this.getData();
    data.notifications = (data.notifications || []).filter(n => String(n.userId) !== String(userId));
    this.saveData(data);
    this.updateNotificationBadge(userId);
    return { success: true };
  }

  updateNotificationBadge(userId) {
    const count = this.getUnreadCount(userId);
    const badge = document.getElementById('notification-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ==================== 活动日志 ====================

  getActivities(filters = {}) {
    const data = this.getData();
    let activities = [...(data.activities || [])];

    if (filters.userId) {
      activities = activities.filter(a => String(a.userId) === String(filters.userId));
    }
    if (filters.type) {
      activities = activities.filter(a => a.type === filters.type);
    }

    const limit = filters.limit || 50;
    return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  createActivity(activityData) {
    const data = this.getData();
    if (!data.activities) data.activities = [];

    const activity = {
      id: 'activity_' + Date.now(),
      ...activityData,
      createdAt: new Date().toLocaleString()
    };
    data.activities.push(activity);

    // 限制活动日志数量
    if (data.activities.length > 500) {
      data.activities = data.activities.slice(-500);
    }

    this.saveData(data);
    return activity;
  }

  // ==================== 代码评审 ====================

  getReviews(filters = {}) {
    const data = this.getData();
    let reviews = [...(data.reviews || [])];

    if (filters.targetUserId) {
      reviews = reviews.filter(r => String(r.targetUserId) === String(filters.targetUserId));
    }
    if (filters.reviewerId) {
      reviews = reviews.filter(r => String(r.reviewerId) === String(filters.reviewerId));
    }
    if (filters.status) {
      reviews = reviews.filter(r => r.status === filters.status);
    }

    return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createReview(reviewData) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();

    if (!data.reviews) data.reviews = [];

    const review = {
      id: 'review_' + Date.now(),
      ...reviewData,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      reviewerRole: currentUser.role,
      status: 'pending',
      replies: [],
      createdAt: new Date().toLocaleString()
    };
    data.reviews.push(review);
    this.saveData(data);

    // 发送通知
    this.createNotification({
      userId: reviewData.targetUserId,
      type: 'review_received',
      title: '收到代码评审',
      content: `${currentUser.name} 对您的代码提交了评审意见`,
      relatedId: review.id,
      relatedType: 'review'
    });

    return { success: true, data: review };
  }

  replyToReview(reviewId, content) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    const index = (data.reviews || []).findIndex(r => r.id === reviewId);
    if (index === -1) return { success: false, message: '评审不存在' };

    const review = data.reviews[index];
    review.replies.push({
      id: 'reply_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: content,
      createdAt: new Date().toLocaleString()
    });
    review.status = 'revised';
    this.saveData(data);

    // 通知评审人
    this.createNotification({
      userId: review.reviewerId,
      type: 'review_replied',
      title: '评审回复',
      content: `${currentUser.name} 回复了您的评审意见`,
      relatedId: reviewId,
      relatedType: 'review'
    });

    return { success: true, data: review };
  }

  updateReviewStatus(reviewId, status, comment) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    const index = (data.reviews || []).findIndex(r => r.id === reviewId);
    if (index === -1) return { success: false, message: '评审不存在' };

    const review = data.reviews[index];
    review.status = status;
    if (comment) {
      review.replies.push({
        id: 'reply_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        content: comment,
        type: 'status_change',
        createdAt: new Date().toLocaleString()
      });
    }
    this.saveData(data);

    // 通知被评审人
    this.createNotification({
      userId: review.targetUserId,
      type: 'review_replied',
      title: `评审${status === 'approved' ? '通过' : '驳回'}`,
      content: `${currentUser.name} ${status === 'approved' ? '通过' : '驳回'}了您的代码`,
      relatedId: reviewId,
      relatedType: 'review'
    });

    return { success: true, data: review };
  }

  // ==================== 实训材料 ====================

  getMaterials(filters = {}) {
    const data = this.getData();
    let materials = [...(data.materials || [])];

    if (filters.userId) {
      materials = materials.filter(m => String(m.userId) === String(filters.userId));
    }
    if (filters.status) {
      materials = materials.filter(m => m.status === filters.status);
    }

    return materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createMaterial(materialData) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();

    if (!data.materials) data.materials = [];

    const material = {
      id: 'material_' + Date.now(),
      ...materialData,
      userId: currentUser.id,
      userName: currentUser.name,
      status: 'submitted',
      createdAt: new Date().toLocaleString()
    };
    data.materials.push(material);
    this.saveData(data);

    return { success: true, data: material };
  }

  updateMaterial(materialId, updates) {
    const data = this.getData();
    const index = (data.materials || []).findIndex(m => m.id === materialId);
    if (index === -1) return { success: false, message: '材料不存在' };

    data.materials[index] = { ...data.materials[index], ...updates };
    this.saveData(data);
    return { success: true, data: data.materials[index] };
  }

  // ==================== 项目管理 ====================

  getProjects() {
    const data = this.getData();
    return data.projects || [];
  }

  getProjectById(projectId) {
    const data = this.getData();
    return (data.projects || []).find(p => p.id === projectId);
  }

  getCurrentProject() {
    const projects = this.getProjects();
    return projects[0] || null;
  }

  advanceProjectPhase(newPhase) {
    const data = this.getData();
    if (data.projects.length > 0) {
      data.projects[0].currentPhase = newPhase;
      this.saveData(data);
      return true;
    }
    return false;
  }

  updateProjectSettings(settings) {
    const data = this.getData();
    if (data.projects.length > 0) {
      data.projects[0] = { ...data.projects[0], ...settings };
      this.saveData(data);
      return true;
    }
    return false;
  }

  // ==================== 系统设置 ====================

  getSettings() {
    const data = this.getData();
    return data.settings || {};
  }

  updateSettings(updates) {
    const data = this.getData();
    data.settings = { ...data.settings, ...updates };
    this.saveData(data);
    return { success: true };
  }

  // ==================== 数据统计 ====================

  getDashboardStats() {
    const currentUser = this.getCurrentUser();
    const project = this.getCurrentProject();
    
    const tasks = this.getTasks(project ? { projectId: project.id } : {});
    const records = this.getRecords({ userId: currentUser.id });
    const evaluations = this.getEvaluations({ evaluateeId: currentUser.id });
    const notifications = this.getNotifications(currentUser.id);
    const unreadCount = this.getUnreadCount(currentUser.id);

    const taskStats = this.getTaskStatistics(project?.id);
    const totalHours = records.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      tasks: taskStats,
      records: {
        total: records.length,
        totalHours: totalHours
      },
      evaluations: {
        count: evaluations.length,
        latestScore: evaluations[0]?.totalScore || '-'
      },
      notifications: {
        total: notifications.length,
        unread: unreadCount
      }
    };
  }

  // ==================== 数据导出 ====================

  exportData(type) {
    const data = this.getData();
    switch (type) {
      case 'tasks':
        return data.tasks || [];
      case 'records':
        return data.records || [];
      case 'evaluations':
        return data.evaluations || [];
      case 'users':
        return (data.users || []).map(u => {
          const { password, ...user } = u;
          return user;
        });
      case 'all':
        const exportData = { ...data };
        exportData.users = exportData.users.map(u => {
          const { password, ...user } = u;
          return user;
        });
        return exportData;
      default:
        return null;
    }
  }

  // ==================== 代码审查标准管理 ====================

  getReviewCriteria() {
    const data = this.getData();
    return data.reviewCriteria || [];
  }

  addReviewCriterion(criterion) {
    const data = this.getData();
    criterion.id = 'c' + Date.now();
    criterion.createdAt = new Date().toISOString().split('T')[0];
    data.reviewCriteria.push(criterion);
    this.saveData(data);
    return criterion;
  }

  updateReviewCriterion(id, updates) {
    const data = this.getData();
    const idx = data.reviewCriteria.findIndex(c => c.id === id);
    if (idx === -1) return null;
    data.reviewCriteria[idx] = { ...data.reviewCriteria[idx], ...updates };
    this.saveData(data);
    return data.reviewCriteria[idx];
  }

  deleteReviewCriterion(id) {
    const data = this.getData();
    data.reviewCriteria = data.reviewCriteria.filter(c => c.id !== id);
    this.saveData(data);
    return { success: true };
  }

  // ==================== 代码提交管理 ====================

  getCodeSubmissions(userId) {
    const data = this.getData();
    const submissions = data.codeSubmissions || [];
    return userId ? submissions.filter(s => s.userId === userId) : submissions;
  }

  submitCode(submission) {
    const data = this.getData();
    submission.id = 's' + Date.now();
    submission.createdAt = new Date().toISOString();
    submission.status = 'pending';
    if (!data.codeSubmissions) data.codeSubmissions = [];
    data.codeSubmissions.push(submission);
    this.saveData(data);
    return submission;
  }

  updateCodeSubmission(id, updates) {
    const data = this.getData();
    const idx = (data.codeSubmissions || []).findIndex(s => s.id === id);
    if (idx === -1) return null;
    data.codeSubmissions[idx] = { ...data.codeSubmissions[idx], ...updates };
    this.saveData(data);
    return data.codeSubmissions[idx];
  }

  // ==================== 数据重置 ====================

  resetAllData() {
    this.resetToDefault();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    return { success: true };
  }
}

// 创建全局实例
const dataManager = new CoreDataManager();
