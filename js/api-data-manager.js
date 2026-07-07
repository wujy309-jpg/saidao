/**
 * API数据管理器 - 使用后端API，支持本地模拟数据回退
 */

class ApiDataManager {
  constructor() {
    this.cache = {};
    this.cacheTimeout = 60000;
    this.cacheTimestamps = {};
    this.useMockData = false; // 是否使用本地模拟数据
    
    // 本地模拟数据
    this.mockData = {
      users: [
        { id: 1, username: 'admin', name: '系统管理员', role: 'ADMIN', email: 'admin@training.com', phone: '13800000000', department: '系统管理部' },
        { id: 2, username: 'teacher01', name: '张老师', role: 'TEACHER', email: 'teacher@training.com', phone: '13800000001', department: '软件工程系' },
        { id: 3, username: 'student01', name: '李同学', role: 'STUDENT', email: 'student@training.com', phone: '13800000002', department: '软件工程系', studentId: '2024001' },
        { id: 4, username: 'student02', name: '王同学', role: 'STUDENT', email: 'wang@training.com', phone: '13800000003', department: '软件工程系', studentId: '2024002' },
        { id: 5, username: 'enterprise01', name: '王工程师', role: 'ENTERPRISE', email: 'enterprise@training.com', phone: '13800000004', department: '技术研发部', company: '北京软通动力教育科技有限公司' }
      ],
      projects: [
        { id: 1, name: '软件实训管理平台开发', description: '开发一套覆盖软件实训全流程的管理与评价系统', createdById: 1, createdByName: '系统管理员', startDate: '2026-03-01', endDate: '2026-06-30', status: 'IN_PROGRESS', currentPhase: 'DEVELOPMENT' }
      ],
      tasks: [
        { id: 1, title: '需求分析文档编写', description: '完成软件实训管理系统的需求分析文档', projectId: 1, projectName: '软件实训管理平台开发', assignedToId: 3, assignedToName: '李同学', createdById: 2, createdByName: '张老师', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-05-10', estimatedHours: 20, actualHours: 8 },
        { id: 2, title: '系统设计文档编写', description: '完成系统的架构设计和数据库设计', projectId: 1, projectName: '软件实训管理平台开发', assignedToId: 3, assignedToName: '李同学', createdById: 2, createdByName: '张老师', status: 'PENDING', priority: 'MEDIUM', dueDate: '2026-05-20', estimatedHours: 30 },
        { id: 3, title: '前端界面开发', description: '完成系统前端界面的开发工作', projectId: 1, projectName: '软件实训管理平台开发', assignedToId: 3, assignedToName: '李同学', createdById: 2, createdByName: '张老师', status: 'PENDING', priority: 'HIGH', dueDate: '2026-06-15', estimatedHours: 80 }
      ],
      records: [
        { id: 1, userId: 3, projectId: 1, taskId: 1, date: '2026-05-20', duration: 4.0, content: '完成了需求分析文档的初稿编写', issues: '对部分业务流程理解不够深入', plan: '与教师沟通确认业务流程' },
        { id: 2, userId: 3, projectId: 1, taskId: 1, date: '2026-05-21', duration: 3.5, content: '根据教师反馈修改了需求分析文档', issues: '无', plan: '开始系统设计文档编写' }
      ],
      evaluations: [
        { id: 1, evaluatorId: 2, evaluatorName: '张老师', evaluateeId: 3, evaluateeName: '李同学', projectId: 1, type: 'TEACHER', techScore: 85, teamworkScore: 90, documentScore: 80, innovationScore: 75, attitudeScore: 95, totalScore: 85, comment: '工作态度认真，团队协作能力强' },
        { id: 2, evaluatorId: 5, evaluatorName: '王工程师', evaluateeId: 3, evaluateeName: '李同学', projectId: 1, type: 'ENTERPRISE', techScore: 80, teamworkScore: 85, documentScore: 75, innovationScore: 70, attitudeScore: 90, totalScore: 80, comment: '具备良好的职业素养' }
      ],
      notifications: [
        { id: 1, userId: 3, type: 'TASK', title: '新任务分配', content: '您有一个新任务：需求分析文档编写', isRead: false, createdAt: '2026-05-19 10:00' },
        { id: 2, userId: 3, type: 'EVALUATION', title: '收到新评价', content: '您收到了一条来自张老师的评价', isRead: false, createdAt: '2026-05-20 15:00' },
        { id: 3, userId: 3, type: 'SYSTEM', title: '系统公告', content: '欢迎使用软件实训管理系统', isRead: true, createdAt: '2026-05-18 09:00' }
      ]
    };
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(key) {
    const timestamp = this.cacheTimestamps[key];
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.cacheTimeout;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.cache[key] = data;
    this.cacheTimestamps[key] = Date.now();
  }

  /**
   * 获取缓存
   */
  getCache(key) {
    return this.cache[key];
  }

  /**
   * 清除缓存
   */
  clearCache(key) {
    if (key) {
      delete this.cache[key];
      delete this.cacheTimestamps[key];
    } else {
      this.cache = {};
      this.cacheTimestamps = {};
    }
  }

  // ==================== 用户相关 ====================

  /**
   * 用户登录
   */
  async login(username, password) {
    return await window.API.AuthAPI.login(username, password);
  }

  /**
   * 用户登出
   */
  logout() {
    window.API.AuthAPI.logout();
    this.clearCache();
    this.useMockData = false;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    return window.API.getCurrentUser();
  }

  /**
   * 检查权限
   */
  hasPermission(permission) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    const roleConfig = ROLE_PERMISSIONS[currentUser.role];
    return roleConfig && roleConfig.permissions.includes(permission);
  }

  /**
   * 获取用户列表
   */
  async getUsers() {
    const cacheKey = 'users';
    if (this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      if (this.useMockData) {
        this.setCache(cacheKey, this.mockData.users);
        return this.mockData.users;
      }
      
      const response = await window.API.UserAPI.getUsers();
      if (response.success) {
        this.setCache(cacheKey, response.data);
        return response.data;
      }
      return this.mockData.users;
    } catch (error) {
      console.warn('获取用户列表失败，使用本地数据:', error.message);
      this.useMockData = true;
      this.setCache(cacheKey, this.mockData.users);
      return this.mockData.users;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(userId) {
    const users = await this.getUsers();
    return users.find(u => u.id === userId) || null;
  }

  /**
   * 创建用户
   */
  async createUser(userData) {
    try {
      if (this.useMockData) {
        const newUser = { id: Date.now(), ...userData };
        this.mockData.users.push(newUser);
        this.clearCache('users');
        return newUser;
      }
      
      const response = await fetch(`http://localhost:8080/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.API.getAuthToken()}`
        },
        body: JSON.stringify(userData)
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache('users');
        return result.data;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('创建用户失败，使用本地模式:', error.message);
      const newUser = { id: Date.now(), ...userData };
      this.mockData.users.push(newUser);
      this.clearCache('users');
      return newUser;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, userData) {
    try {
      if (this.useMockData) {
        const index = this.mockData.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.mockData.users[index] = { ...this.mockData.users[index], ...userData };
          this.clearCache('users');
          return true;
        }
        return false;
      }
      
      const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.API.getAuthToken()}`
        },
        body: JSON.stringify(userData)
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache('users');
        return true;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('更新用户失败，使用本地模式:', error.message);
      const index = this.mockData.users.findIndex(u => u.id === userId);
      if (index !== -1) {
        this.mockData.users[index] = { ...this.mockData.users[index], ...userData };
        this.clearCache('users');
        return true;
      }
      return false;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    try {
      if (this.useMockData) {
        this.mockData.users = this.mockData.users.filter(u => u.id !== userId);
        this.clearCache('users');
        return true;
      }
      
      const response = await fetch(`http://localhost:8080/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache('users');
        return true;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('删除用户失败，使用本地模式:', error.message);
      this.mockData.users = this.mockData.users.filter(u => u.id !== userId);
      this.clearCache('users');
      return true;
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(userId) {
    try {
      if (this.useMockData) {
        return true;
      }
      
      const response = await fetch(`http://localhost:8080/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('重置密码失败，使用本地模式:', error.message);
      return true;
    }
  }

  // ==================== 任务相关 ====================

  /**
   * 获取任务列表
   */
  async getTasks(filters = {}) {
    const cacheKey = `tasks_${JSON.stringify(filters)}`;
    if (this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      if (this.useMockData) {
        let tasks = [...this.mockData.tasks];
        if (filters.assigneeId) tasks = tasks.filter(t => t.assignedToId === filters.assigneeId);
        if (filters.projectId) tasks = tasks.filter(t => t.projectId === filters.projectId);
        if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
        this.setCache(cacheKey, tasks);
        return tasks;
      }
      
      let tasks = [];
      if (filters.assigneeId) {
        const response = await window.API.TaskAPI.getUserTasks(filters.assigneeId);
        tasks = response.success ? response.data.map(t => window.API.DataConverter.convertTask(t)) : [];
      } else if (filters.projectId) {
        const response = await window.API.TaskAPI.getProjectTasks(filters.projectId);
        tasks = response.success ? response.data.map(t => window.API.DataConverter.convertTask(t)) : [];
      } else {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const response = await window.API.TaskAPI.getUserTasks(currentUser.id);
          tasks = response.success ? response.data.map(t => window.API.DataConverter.convertTask(t)) : [];
        }
      }

      if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
      this.setCache(cacheKey, tasks);
      return tasks;
    } catch (error) {
      console.warn('获取任务列表失败，使用本地数据:', error.message);
      this.useMockData = true;
      let tasks = [...this.mockData.tasks];
      if (filters.assigneeId) tasks = tasks.filter(t => t.assignedToId === filters.assigneeId);
      if (filters.projectId) tasks = tasks.filter(t => t.projectId === filters.projectId);
      if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
      this.setCache(cacheKey, tasks);
      return tasks;
    }
  }

  /**
   * 根据ID获取任务
   */
  async getTaskById(taskId) {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === taskId) || null;
  }

  /**
   * 创建任务
   */
  async createTask(taskData) {
    try {
      if (this.useMockData) {
        const currentUser = this.getCurrentUser();
        const newTask = { id: Date.now(), ...taskData, createdById: currentUser.id, createdByName: currentUser.name, status: 'PENDING' };
        this.mockData.tasks.push(newTask);
        this.clearCache();
        return newTask;
      }
      
      const currentUser = this.getCurrentUser();
      const response = await window.API.TaskAPI.create(taskData, currentUser.id, taskData.projectId);
      if (response.success) {
        this.clearCache();
        return window.API.DataConverter.convertTask(response.data);
      }
      throw new Error(response.message);
    } catch (error) {
      console.warn('创建任务失败，使用本地模式:', error.message);
      const currentUser = this.getCurrentUser();
      const newTask = { id: Date.now(), ...taskData, createdById: currentUser.id, createdByName: currentUser.name, status: 'PENDING' };
      this.mockData.tasks.push(newTask);
      this.clearCache();
      return newTask;
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, status, comment = '') {
    try {
      if (this.useMockData) {
        const task = this.mockData.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
          if (status === 'COMPLETED' || status === 'APPROVED') {
            task.completedAt = new Date().toISOString();
          }
          this.clearCache();
          return true;
        }
        return false;
      }
      
      let response;
      if (status === 'submitted') {
        response = await window.API.TaskAPI.submit(taskId);
      } else if (['approved', 'rejected', 'completed'].includes(status)) {
        response = await window.API.TaskAPI.review(taskId, status, comment);
      } else {
        response = { success: true };
      }
      
      if (response.success) {
        this.clearCache();
        return true;
      }
      throw new Error(response.message);
    } catch (error) {
      console.warn('更新任务状态失败，使用本地模式:', error.message);
      const task = this.mockData.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        this.clearCache();
        return true;
      }
      return false;
    }
  }

  /**
   * 添加任务评论
   */
  async addTaskComment(taskId, content) {
    return true;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    this.mockData.tasks = this.mockData.tasks.filter(t => t.id !== taskId);
    this.clearCache();
    return true;
  }

  /**
   * 获取任务统计
   */
  async getTaskStatistics(projectId) {
    try {
      if (this.useMockData) {
        const tasks = projectId 
          ? this.mockData.tasks.filter(t => t.projectId === projectId)
          : this.mockData.tasks;
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
        const pending = tasks.filter(t => t.status === 'PENDING').length;
        const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        return { totalTasks: total, completedTasks: completed, pendingTasks: pending, inProgressTasks: inProgress, completionRate: total > 0 ? Math.round(completed * 100 / total) : 0 };
      }
      
      const currentUser = this.getCurrentUser();
      const response = await window.API.TaskAPI.getStatistics(currentUser.id);
      if (response.success) return response.data;
      throw new Error('获取统计失败');
    } catch (error) {
      console.warn('获取任务统计失败，使用本地数据:', error.message);
      this.useMockData = true;
      const tasks = projectId 
        ? this.mockData.tasks.filter(t => t.projectId === projectId)
        : this.mockData.tasks;
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      return { totalTasks: total, completedTasks: completed, pendingTasks: 0, inProgressTasks: 0, completionRate: total > 0 ? Math.round(completed * 100 / total) : 0 };
    }
  }

  // ==================== 项目相关 ====================

  /**
   * 获取项目列表
   */
  async getProjects() {
    const cacheKey = 'projects';
    if (this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      if (this.useMockData) {
        this.setCache(cacheKey, this.mockData.projects);
        return this.mockData.projects;
      }
      
      const response = await window.API.ProjectAPI.getProjects();
      if (response.success) {
        const projects = response.data.map(p => window.API.DataConverter.convertProject(p));
        this.setCache(cacheKey, projects);
        return projects;
      }
      return this.mockData.projects;
    } catch (error) {
      console.warn('获取项目列表失败，使用本地数据:', error.message);
      this.useMockData = true;
      this.setCache(cacheKey, this.mockData.projects);
      return this.mockData.projects;
    }
  }

  /**
   * 根据ID获取项目
   */
  async getProjectById(projectId) {
    const projects = await this.getProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * 推进项目阶段
   */
  async advanceProjectPhase(newPhase) {
    try {
      const projects = await this.getProjects();
      if (projects.length > 0) {
        if (this.useMockData) {
          projects[0].currentPhase = newPhase;
          this.clearCache('projects');
          return true;
        }
        
        const response = await window.API.ProjectAPI.updatePhase(projects[0].id, newPhase);
        if (response.success) {
          this.clearCache('projects');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('推进项目阶段失败，使用本地模式:', error.message);
      const projects = await this.getProjects();
      if (projects.length > 0) {
        projects[0].currentPhase = newPhase;
        this.clearCache('projects');
        return true;
      }
      return false;
    }
  }

  // ==================== 过程记录相关 ====================

  /**
   * 获取过程记录
   */
  async getRecords(filters = {}) {
    const cacheKey = `records_${JSON.stringify(filters)}`;
    if (this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      if (this.useMockData) {
        let records = [...this.mockData.records];
        if (filters.userId) records = records.filter(r => r.userId === filters.userId);
        if (filters.projectId) records = records.filter(r => r.projectId === filters.projectId);
        if (filters.taskId) records = records.filter(r => r.taskId === filters.taskId);
        this.setCache(cacheKey, records);
        return records;
      }
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) return [];

      let url = `http://localhost:8080/api/records/user/${currentUser.id}`;
      if (filters.projectId) {
        url = `http://localhost:8080/api/records/user/${currentUser.id}/project/${filters.projectId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      let records = result.success ? result.data : [];
      if (filters.taskId) records = records.filter(r => r.task?.id === filters.taskId);

      this.setCache(cacheKey, records);
      return records;
    } catch (error) {
      console.warn('获取过程记录失败，使用本地数据:', error.message);
      this.useMockData = true;
      let records = [...this.mockData.records];
      if (filters.userId) records = records.filter(r => r.userId === filters.userId);
      if (filters.projectId) records = records.filter(r => r.projectId === filters.projectId);
      if (filters.taskId) records = records.filter(r => r.taskId === filters.taskId);
      this.setCache(cacheKey, records);
      return records;
    }
  }

  /**
   * 创建过程记录
   */
  async createRecord(recordData) {
    try {
      if (this.useMockData) {
        const currentUser = this.getCurrentUser();
        const newRecord = { id: Date.now(), userId: currentUser.id, ...recordData, createdAt: new Date().toLocaleString() };
        this.mockData.records.push(newRecord);
        this.clearCache();
        return newRecord;
      }
      
      const currentUser = this.getCurrentUser();
      const params = new URLSearchParams({ userId: currentUser.id });
      if (recordData.projectId) params.append('projectId', recordData.projectId);
      if (recordData.taskId) params.append('taskId', recordData.taskId);

      const response = await fetch(`http://localhost:8080/api/records?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.API.getAuthToken()}`
        },
        body: JSON.stringify(recordData)
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache();
        return result.data;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('创建过程记录失败，使用本地模式:', error.message);
      const currentUser = this.getCurrentUser();
      const newRecord = { id: Date.now(), userId: currentUser.id, ...recordData, createdAt: new Date().toLocaleString() };
      this.mockData.records.push(newRecord);
      this.clearCache();
      return newRecord;
    }
  }

  /**
   * 根据ID获取记录
   */
  async getRecordById(recordId) {
    const currentUser = this.getCurrentUser();
    const records = await this.getRecords({ userId: currentUser.id });
    return records.find(r => r.id === recordId) || null;
  }

  /**
   * 更新记录
   */
  async updateRecord(recordId, recordData) {
    try {
      if (this.useMockData) {
        const index = this.mockData.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
          this.mockData.records[index] = { ...this.mockData.records[index], ...recordData };
          this.clearCache();
          return true;
        }
        return false;
      }
      
      const response = await fetch(`http://localhost:8080/api/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.API.getAuthToken()}`
        },
        body: JSON.stringify(recordData)
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache();
        return true;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('更新记录失败，使用本地模式:', error.message);
      const index = this.mockData.records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        this.mockData.records[index] = { ...this.mockData.records[index], ...recordData };
        this.clearCache();
        return true;
      }
      return false;
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(recordId) {
    try {
      if (this.useMockData) {
        this.mockData.records = this.mockData.records.filter(r => r.id !== recordId);
        this.clearCache();
        return true;
      }
      
      const response = await fetch(`http://localhost:8080/api/records/${recordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache();
        return true;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('删除记录失败，使用本地模式:', error.message);
      this.mockData.records = this.mockData.records.filter(r => r.id !== recordId);
      this.clearCache();
      return true;
    }
  }

  // ==================== 评价相关 ====================

  /**
   * 获取评价列表
   */
  async getEvaluations(filters = {}) {
    const cacheKey = `evaluations_${JSON.stringify(filters)}`;
    if (this.isCacheValid(cacheKey)) {
      return this.getCache(cacheKey);
    }

    try {
      if (this.useMockData) {
        let evaluations = [...this.mockData.evaluations];
        if (filters.evaluateeId) evaluations = evaluations.filter(e => e.evaluateeId === filters.evaluateeId);
        if (filters.projectId) evaluations = evaluations.filter(e => e.projectId === filters.projectId);
        if (filters.type) evaluations = evaluations.filter(e => e.type === filters.type);
        this.setCache(cacheKey, evaluations);
        return evaluations;
      }
      
      let evaluations = [];
      if (filters.evaluateeId) {
        const response = await fetch(`http://localhost:8080/api/evaluations/evaluatee/${filters.evaluateeId}`, {
          headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
        });
        const result = await response.json();
        evaluations = result.success ? result.data : [];
      } else if (filters.projectId) {
        const response = await fetch(`http://localhost:8080/api/evaluations/project/${filters.projectId}`, {
          headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
        });
        const result = await response.json();
        evaluations = result.success ? result.data : [];
      } else {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const response = await fetch(`http://localhost:8080/api/evaluations/evaluatee/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
          });
          const result = await response.json();
          evaluations = result.success ? result.data : [];
        }
      }

      if (filters.type) evaluations = evaluations.filter(e => e.type === filters.type);
      this.setCache(cacheKey, evaluations);
      return evaluations;
    } catch (error) {
      console.warn('获取评价列表失败，使用本地数据:', error.message);
      this.useMockData = true;
      let evaluations = [...this.mockData.evaluations];
      if (filters.evaluateeId) evaluations = evaluations.filter(e => e.evaluateeId === filters.evaluateeId);
      if (filters.projectId) evaluations = evaluations.filter(e => e.projectId === filters.projectId);
      if (filters.type) evaluations = evaluations.filter(e => e.type === filters.type);
      this.setCache(cacheKey, evaluations);
      return evaluations;
    }
  }

  /**
   * 根据ID获取评价
   */
  async getEvaluationById(evaluationId) {
    const evaluations = await this.getEvaluations();
    return evaluations.find(e => e.id === evaluationId) || null;
  }

  /**
   * 创建评价
   */
  async createEvaluation(evaluationData) {
    try {
      if (this.useMockData) {
        const currentUser = this.getCurrentUser();
        const newEvaluation = { id: Date.now(), evaluatorId: currentUser.id, evaluatorName: currentUser.name, ...evaluationData };
        this.mockData.evaluations.push(newEvaluation);
        this.clearCache();
        return newEvaluation;
      }
      
      const currentUser = this.getCurrentUser();
      const response = await fetch('http://localhost:8080/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.API.getAuthToken()}`
        },
        body: JSON.stringify({ ...evaluationData, evaluatorId: currentUser.id })
      });
      const result = await response.json();
      if (result.success) {
        this.clearCache();
        return result.data;
      }
      throw new Error(result.message);
    } catch (error) {
      console.warn('创建评价失败，使用本地模式:', error.message);
      const currentUser = this.getCurrentUser();
      const newEvaluation = { id: Date.now(), evaluatorId: currentUser.id, evaluatorName: currentUser.name, ...evaluationData };
      this.mockData.evaluations.push(newEvaluation);
      this.clearCache();
      return newEvaluation;
    }
  }

  /**
   * 计算学生综合得分
   */
  async calculateStudentScore(studentId, projectId) {
    try {
      const evaluations = await this.getEvaluations({ evaluateeId: studentId, projectId });
      if (evaluations.length === 0) return null;

      const typeScores = {};
      evaluations.forEach(evaluation => {
        if (!typeScores[evaluation.type]) typeScores[evaluation.type] = [];
        typeScores[evaluation.type].push(evaluation.totalScore);
      });

      const weights = { TEACHER: 0.4, ENTERPRISE: 0.4, PEER: 0.2 };
      let finalScore = 0;
      let totalWeight = 0;

      for (const [type, scores] of Object.entries(typeScores)) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const weight = weights[type] || 0.2;
        finalScore += avgScore * weight;
        totalWeight += weight;
      }

      return totalWeight > 0 ? Math.round((finalScore / totalWeight) * 10) / 10 : 0;
    } catch (error) {
      console.error('计算学生得分失败:', error);
      return null;
    }
  }

  // ==================== 通知相关 ====================

  /**
   * 获取用户通知列表
   */
  async getNotifications(userId) {
    try {
      if (this.useMockData) {
        return this.mockData.notifications.filter(n => n.userId === userId);
      }
      
      const response = await fetch(`http://localhost:8080/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      if (result.success) return result.data;
      return this.mockData.notifications.filter(n => n.userId === userId);
    } catch (error) {
      console.warn('获取通知失败，使用本地数据:', error.message);
      this.useMockData = true;
      return this.mockData.notifications.filter(n => n.userId === userId);
    }
  }

  /**
   * 标记通知为已读
   */
  async markNotificationRead(notificationId) {
    try {
      if (this.useMockData) {
        const notification = this.mockData.notifications.find(n => n.id === notificationId);
        if (notification) notification.isRead = true;
        return true;
      }
      
      const response = await fetch(`http://localhost:8080/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('标记通知已读失败，使用本地模式:', error.message);
      const notification = this.mockData.notifications.find(n => n.id === notificationId);
      if (notification) notification.isRead = true;
      return true;
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllNotificationsRead(userId) {
    try {
      if (this.useMockData) {
        this.mockData.notifications.forEach(n => {
          if (n.userId === userId) n.isRead = true;
        });
        return true;
      }
      
      const response = await fetch(`http://localhost:8080/api/notifications/user/${userId}/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${window.API.getAuthToken()}` }
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.warn('标记所有通知已读失败，使用本地模式:', error.message);
      this.mockData.notifications.forEach(n => {
        if (n.userId === userId) n.isRead = true;
      });
      return true;
    }
  }

  // ==================== 统计相关 ====================

  /**
   * 获取工作时长统计
   */
  async getWorkDurationStats(userId, projectId) {
    try {
      const records = await this.getRecords({ userId, projectId });
      const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
      return {
        totalHours: totalDuration,
        recordCount: records.length,
        avgHoursPerDay: records.length > 0 ? Math.round(totalDuration / records.length * 10) / 10 : 0
      };
    } catch (error) {
      console.error('获取工作时长统计失败:', error);
      return { totalHours: 0, recordCount: 0, avgHoursPerDay: 0 };
    }
  }
}

// 创建全局API数据管理器实例
const apiDataManager = new ApiDataManager();
