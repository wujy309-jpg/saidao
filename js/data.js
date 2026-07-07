/**
 * 软件实训全流程管理与评价系统 - 数据层
 * 数据模型定义与模拟数据
 */

// ==================== 数据模型定义 ====================

/**
 * 角色枚举
 */
const ROLES = {
  ADMIN: 'admin',        // 管理员
  TEACHER: 'teacher',    // 指导教师
  STUDENT: 'student',    // 学生
  ENTERPRISE: 'enterprise' // 企业导师
};

/**
 * 角色权限配置
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    name: '系统管理员',
    permissions: ['user_manage', 'task_manage', 'record_view', 'evaluate_manage', 'system_config', 'data_export']
  },
  [ROLES.TEACHER]: {
    name: '指导教师',
    permissions: ['task_create', 'task_assign', 'record_view', 'evaluate_create', 'evaluate_score', 'data_export']
  },
  [ROLES.STUDENT]: {
    name: '学生',
    permissions: ['task_view', 'task_submit', 'record_create', 'record_edit', 'evaluate_view']
  },
  [ROLES.ENTERPRISE]: {
    name: '企业导师',
    permissions: ['task_view', 'record_view', 'evaluate_create', 'evaluate_score']
  }
};

/**
 * 任务状态枚举
 */
const TASK_STATUS = {
  PENDING: 'pending',        // 待开始
  IN_PROGRESS: 'in_progress', // 进行中
  SUBMITTED: 'submitted',    // 已提交
  REVIEWING: 'reviewing',    // 审核中
  APPROVED: 'approved',      // 已通过
  REJECTED: 'rejected',      // 已驳回
  COMPLETED: 'completed'     // 已完成
};

/**
 * 任务状态显示文本
 */
const TASK_STATUS_TEXT = {
  [TASK_STATUS.PENDING]: '待开始',
  [TASK_STATUS.IN_PROGRESS]: '进行中',
  [TASK_STATUS.SUBMITTED]: '已提交',
  [TASK_STATUS.REVIEWING]: '审核中',
  [TASK_STATUS.APPROVED]: '已通过',
  [TASK_STATUS.REJECTED]: '已驳回',
  [TASK_STATUS.COMPLETED]: '已完成'
};

/**
 * 评价维度枚举
 */
const EVALUATE_DIMENSIONS = {
  TECHNICAL: 'technical',      // 技术能力
  TEAMWORK: 'teamwork',        // 团队协作
  DOCUMENT: 'document',        // 文档质量
  INNOVATION: 'innovation',    // 创新能力
  ATTITUDE: 'attitude'         // 工作态度
};

/**
 * 评价维度配置
 */
const EVALUATE_DIMENSION_CONFIG = {
  [EVALUATE_DIMENSIONS.TECHNICAL]: {
    name: '技术能力',
    description: '代码质量、技术实现、问题解决能力',
    weight: 0.3,
    maxScore: 100
  },
  [EVALUATE_DIMENSIONS.TEAMWORK]: {
    name: '团队协作',
    description: '沟通能力、任务配合、团队贡献',
    weight: 0.2,
    maxScore: 100
  },
  [EVALUATE_DIMENSIONS.DOCUMENT]: {
    name: '文档质量',
    description: '需求文档、设计文档、测试文档',
    weight: 0.2,
    maxScore: 100
  },
  [EVALUATE_DIMENSIONS.INNOVATION]: {
    name: '创新能力',
    description: '创新思维、方案优化、技术探索',
    weight: 0.15,
    maxScore: 100
  },
  [EVALUATE_DIMENSIONS.ATTITUDE]: {
    name: '工作态度',
    description: '责任心、主动性、学习态度',
    weight: 0.15,
    maxScore: 100
  }
};

/**
 * 实训流程阶段
 */
const TRAINING_PHASES = {
  PREPARATION: 'preparation',   // 准备阶段
  REQUIREMENT: 'requirement',   // 需求分析
  DESIGN: 'design',             // 设计阶段
  DEVELOPMENT: 'development',   // 开发阶段
  TESTING: 'testing',           // 测试阶段
  DELIVERY: 'delivery'          // 交付阶段
};

/**
 * 流程阶段配置
 */
const PHASE_CONFIG = {
  [TRAINING_PHASES.PREPARATION]: {
    name: '准备阶段',
    description: '项目启动、团队组建、环境搭建',
    order: 1,
    tasks: ['项目启动会', '团队分工', '开发环境配置', '代码仓库创建']
  },
  [TRAINING_PHASES.REQUIREMENT]: {
    name: '需求分析',
    description: '需求调研、需求文档、需求评审',
    order: 2,
    tasks: ['需求调研', '需求规格说明书', '需求评审', '需求确认']
  },
  [TRAINING_PHASES.DESIGN]: {
    name: '设计阶段',
    description: '架构设计、数据库设计、接口设计',
    order: 3,
    tasks: ['系统架构设计', '数据库设计', '接口设计', '设计评审']
  },
  [TRAINING_PHASES.DEVELOPMENT]: {
    name: '开发阶段',
    description: '编码实现、代码审查、单元测试',
    order: 4,
    tasks: ['功能开发', '代码审查', '单元测试', '集成测试']
  },
  [TRAINING_PHASES.TESTING]: {
    name: '测试阶段',
    description: '系统测试、缺陷修复、验收测试',
    order: 5,
    tasks: ['系统测试', '缺陷修复', '性能测试', '验收测试']
  },
  [TRAINING_PHASES.DELIVERY]: {
    name: '交付阶段',
    description: '部署上线、项目总结、成果展示',
    order: 6,
    tasks: ['系统部署', '用户培训', '项目总结', '成果展示']
  }
};

// ==================== 模拟数据 ====================

/**
 * 模拟用户数据
 */
const MOCK_USERS = [
  {
    id: 'user_001',
    username: 'admin',
    password: 'admin123',
    name: '系统管理员',
    role: ROLES.ADMIN,
    email: 'admin@example.com',
    phone: '13800000001',
    department: '信息中心'
  },
  {
    id: 'user_002',
    username: 'teacher01',
    password: 'teacher123',
    name: '张教授',
    role: ROLES.TEACHER,
    email: 'zhang@example.com',
    phone: '13800000002',
    department: '软件工程系'
  },
  {
    id: 'user_003',
    username: 'student01',
    password: 'student123',
    name: '李同学',
    role: ROLES.STUDENT,
    email: 'li@example.com',
    phone: '13800000003',
    department: '软件工程2022级',
    studentId: '2022001'
  },
  {
    id: 'user_004',
    username: 'student02',
    password: 'student123',
    name: '王同学',
    role: ROLES.STUDENT,
    email: 'wang@example.com',
    phone: '13800000004',
    department: '软件工程2022级',
    studentId: '2022002'
  },
  {
    id: 'user_005',
    username: 'enterprise01',
    password: 'enterprise123',
    name: '赵工程师',
    role: ROLES.ENTERPRISE,
    email: 'zhao@example.com',
    phone: '13800000005',
    department: '软通动力',
    company: '北京软通动力教育科技有限公司'
  }
];

/**
 * 模拟任务数据
 */
const MOCK_TASKS = [
  {
    id: 'task_001',
    title: '需求规格说明书编写',
    description: '完成《学生信息管理系统》需求规格说明书，包含功能需求、非功能需求、用例图等。',
    phase: TRAINING_PHASES.REQUIREMENT,
    status: TASK_STATUS.APPROVED,
    assigneeId: 'user_003',
    assignerId: 'user_002',
    projectId: 'project_001',
    priority: 'high',
    startDate: '2026-04-01',
    dueDate: '2026-04-10',
    completedDate: '2026-04-09',
    createdAt: '2026-03-28',
    attachments: ['需求规格说明书v1.0.docx'],
    comments: [
      { userId: 'user_002', content: '文档结构清晰，继续完善细节', time: '2026-04-09 14:30' }
    ]
  },
  {
    id: 'task_002',
    title: '系统架构设计文档',
    description: '完成系统架构设计，包括技术选型、模块划分、部署架构等。',
    phase: TRAINING_PHASES.DESIGN,
    status: TASK_STATUS.IN_PROGRESS,
    assigneeId: 'user_003',
    assignerId: 'user_002',
    projectId: 'project_001',
    priority: 'high',
    startDate: '2026-04-11',
    dueDate: '2026-04-20',
    completedDate: null,
    createdAt: '2026-04-05',
    attachments: [],
    comments: []
  },
  {
    id: 'task_003',
    title: '数据库设计',
    description: '完成数据库ER图设计、表结构设计、索引设计等。',
    phase: TRAINING_PHASES.DESIGN,
    status: TASK_STATUS.PENDING,
    assigneeId: 'user_004',
    assignerId: 'user_002',
    projectId: 'project_001',
    priority: 'medium',
    startDate: '2026-04-15',
    dueDate: '2026-04-25',
    completedDate: null,
    createdAt: '2026-04-05',
    attachments: [],
    comments: []
  },
  {
    id: 'task_004',
    title: '用户管理模块开发',
    description: '实现用户注册、登录、信息管理等功能。',
    phase: TRAINING_PHASES.DEVELOPMENT,
    status: TASK_STATUS.PENDING,
    assigneeId: 'user_003',
    assignerId: 'user_002',
    projectId: 'project_001',
    priority: 'high',
    startDate: '2026-04-21',
    dueDate: '2026-05-05',
    completedDate: null,
    createdAt: '2026-04-10',
    attachments: [],
    comments: []
  },
  {
    id: 'task_005',
    title: '成绩管理模块开发',
    description: '实现成绩录入、查询、统计等功能。',
    phase: TRAINING_PHASES.DEVELOPMENT,
    status: TASK_STATUS.PENDING,
    assigneeId: 'user_004',
    assignerId: 'user_002',
    projectId: 'project_001',
    priority: 'medium',
    startDate: '2026-04-21',
    dueDate: '2026-05-05',
    completedDate: null,
    createdAt: '2026-04-10',
    attachments: [],
    comments: []
  }
];

/**
 * 模拟项目数据
 */
const MOCK_PROJECTS = [
  {
    id: 'project_001',
    name: '学生信息管理系统',
    description: '面向高校的学生信息管理系统，实现学生基本信息、成绩、课程等管理功能。',
    phase: TRAINING_PHASES.DESIGN,
    startDate: '2026-03-25',
    endDate: '2026-06-15',
    teacherId: 'user_002',
    enterpriseId: 'user_005',
    members: ['user_003', 'user_004'],
    status: 'active',
    createdAt: '2026-03-20'
  }
];

/**
 * 模拟过程记录数据
 */
const MOCK_RECORDS = [
  {
    id: 'record_001',
    userId: 'user_003',
    projectId: 'project_001',
    taskId: 'task_001',
    date: '2026-04-01',
    type: 'daily',
    content: '今天完成了需求文档的框架搭建，包括功能需求、非功能需求等章节。明天继续完善用例图部分。',
    duration: 4, // 工作时长（小时）
    issues: '对部分业务流程理解不够清晰',
    plan: '明天与产品经理沟通确认业务流程',
    createdAt: '2026-04-01 18:00'
  },
  {
    id: 'record_002',
    userId: 'user_003',
    projectId: 'project_001',
    taskId: 'task_001',
    date: '2026-04-02',
    type: 'daily',
    content: '完成了用例图绘制，与团队讨论了部分业务流程。今天效率较高。',
    duration: 5,
    issues: '无',
    plan: '继续完善需求文档细节',
    createdAt: '2026-04-02 18:30'
  },
  {
    id: 'record_003',
    userId: 'user_004',
    projectId: 'project_001',
    taskId: 'task_003',
    date: '2026-04-15',
    type: 'daily',
    content: '开始数据库设计工作，完成了ER图初稿。',
    duration: 3,
    issues: '对部分表关系设计有疑问',
    plan: '明天请教老师确认表关系',
    createdAt: '2026-04-15 17:00'
  }
];

/**
 * 模拟评价数据
 */
const MOCK_EVALUATIONS = [
  {
    id: 'eval_001',
    evaluateeId: 'user_003',
    evaluatorId: 'user_002',
    projectId: 'project_001',
    taskId: 'task_001',
    type: 'teacher', // teacher: 教师评价, enterprise: 企业评价, peer: 同伴互评
    dimensions: {
      [EVALUATE_DIMENSIONS.TECHNICAL]: 85,
      [EVALUATE_DIMENSIONS.TEAMWORK]: 90,
      [EVALUATE_DIMENSIONS.DOCUMENT]: 88,
      [EVALUATE_DIMENSIONS.INNOVATION]: 75,
      [EVALUATE_DIMENSIONS.ATTITUDE]: 92
    },
    totalScore: 86.5,
    comment: '需求文档完成质量较高，工作态度认真，建议加强创新思维。',
    createdAt: '2026-04-10 10:00'
  },
  {
    id: 'eval_002',
    evaluateeId: 'user_003',
    evaluatorId: 'user_005',
    projectId: 'project_001',
    taskId: 'task_001',
    type: 'enterprise',
    dimensions: {
      [EVALUATE_DIMENSIONS.TECHNICAL]: 82,
      [EVALUATE_DIMENSIONS.TEAMWORK]: 88,
      [EVALUATE_DIMENSIONS.DOCUMENT]: 85,
      [EVALUATE_DIMENSIONS.INNOVATION]: 78,
      [EVALUATE_DIMENSIONS.ATTITUDE]: 90
    },
    totalScore: 84.7,
    comment: '文档规范，表达清晰，建议多参考企业实际项目案例。',
    createdAt: '2026-04-11 15:00'
  }
];

// ==================== 数据管理类 ====================

/**
 * 数据管理器
 * 负责数据的存取和模拟
 */
class DataManager {
  constructor() {
    this.storageKey = 'training_system_data';
    this.initializeData();
  }

  /**
   * 初始化数据
   */
  initializeData() {
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const initialData = {
        users: MOCK_USERS,
        tasks: MOCK_TASKS,
        projects: MOCK_PROJECTS,
        records: MOCK_RECORDS,
        evaluations: MOCK_EVALUATIONS,
        currentUser: null
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
  }

  /**
   * 获取所有数据
   */
  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * 保存数据
   */
  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  /**
   * 重置数据为初始状态
   */
  resetData() {
    localStorage.removeItem(this.storageKey);
    this.initializeData();
  }

  // ==================== 用户相关 ====================

  /**
   * 用户登录
   */
  login(username, password) {
    const data = this.getData();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (user) {
      data.currentUser = { ...user };
      delete data.currentUser.password;
      this.saveData(data);
      return { success: true, user: data.currentUser };
    }
    return { success: false, message: '用户名或密码错误' };
  }

  /**
   * 用户登出
   */
  logout() {
    const data = this.getData();
    data.currentUser = null;
    this.saveData(data);
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    // 优先从 api.js 的 localStorage 获取（保持同步）
    const apiUser = localStorage.getItem('currentUser');
    if (apiUser) {
      try {
        return JSON.parse(apiUser);
      } catch (e) {
        // 解析失败，回退到本地数据
      }
    }
    const data = this.getData();
    return data.currentUser;
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
  getUsers() {
    const data = this.getData();
    return data.users.map(u => {
      const { password, ...user } = u;
      return user;
    });
  }

  /**
   * 根据ID获取用户
   */
  getUserById(userId) {
    if (!userId) return null;
    const data = this.getData();
    // 兼容数字和字符串类型的ID
    const user = data.users.find(u => String(u.id) === String(userId));
    if (user) {
      const { password, ...userInfo } = user;
      return userInfo;
    }
    return null;
  }

  /**
   * 创建用户
   */
  createUser(userData) {
    const data = this.getData();
    const newUser = {
      id: 'user_' + Date.now(),
      ...userData,
      createdAt: new Date().toISOString().split('T')[0]
    };
    data.users.push(newUser);
    this.saveData(data);
    return newUser;
  }

  /**
   * 更新用户信息
   */
  updateUser(userId, userData) {
    const data = this.getData();
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      data.users[userIndex] = { ...data.users[userIndex], ...userData };
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 删除用户
   */
  deleteUser(userId) {
    const data = this.getData();
    data.users = data.users.filter(u => u.id !== userId);
    this.saveData(data);
    return true;
  }

  /**
   * 重置用户密码
   */
  resetUserPassword(userId) {
    const data = this.getData();
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      data.users[userIndex].password = '123456';
      this.saveData(data);
      return true;
    }
    return false;
  }

  // ==================== 任务相关 ====================

  /**
   * 获取任务列表
   */
  getTasks(filters = {}) {
    const data = this.getData();
    let tasks = [...data.tasks];

    if (filters.projectId) {
      tasks = tasks.filter(t => t.projectId === filters.projectId);
    }
    if (filters.assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.phase) {
      tasks = tasks.filter(t => t.phase === filters.phase);
    }

    return tasks;
  }

  /**
   * 根据ID获取任务
   */
  getTaskById(taskId) {
    const data = this.getData();
    return data.tasks.find(t => t.id === taskId);
  }

  /**
   * 创建任务
   */
  createTask(task) {
    const data = this.getData();
    const newTask = {
      id: 'task_' + Date.now(),
      ...task,
      status: TASK_STATUS.PENDING,
      createdAt: new Date().toISOString().split('T')[0],
      completedDate: null,
      attachments: [],
      comments: []
    };
    data.tasks.push(newTask);
    this.saveData(data);
    return newTask;
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId, status, comment = '') {
    const data = this.getData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      data.tasks[taskIndex].status = status;
      if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.APPROVED) {
        data.tasks[taskIndex].completedDate = new Date().toISOString().split('T')[0];
      }
      if (comment) {
        const currentUser = this.getCurrentUser();
        data.tasks[taskIndex].comments.push({
          userId: currentUser.id,
          content: comment,
          time: new Date().toLocaleString()
        });
      }
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 添加任务评论
   */
  addTaskComment(taskId, content) {
    const data = this.getData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const currentUser = this.getCurrentUser();
      data.tasks[taskIndex].comments.push({
        userId: currentUser.id,
        content: content,
        time: new Date().toLocaleString()
      });
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId) {
    const data = this.getData();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    this.saveData(data);
    return true;
  }

  // ==================== 过程记录相关 ====================

  /**
   * 获取过程记录
   */
  getRecords(filters = {}) {
    const data = this.getData();
    let records = [...data.records];

    if (filters.userId) {
      records = records.filter(r => r.userId === filters.userId);
    }
    if (filters.projectId) {
      records = records.filter(r => r.projectId === filters.projectId);
    }
    if (filters.taskId) {
      records = records.filter(r => r.taskId === filters.taskId);
    }

    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * 创建过程记录
   */
  createRecord(record) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    const newRecord = {
      id: 'record_' + Date.now(),
      userId: currentUser.id,
      ...record,
      createdAt: new Date().toLocaleString()
    };
    data.records.push(newRecord);
    this.saveData(data);
    return newRecord;
  }

  /**
   * 根据ID获取记录
   */
  getRecordById(recordId) {
    const data = this.getData();
    return data.records.find(r => r.id === recordId);
  }

  /**
   * 更新记录
   */
  updateRecord(recordId, recordData) {
    const data = this.getData();
    const recordIndex = data.records.findIndex(r => r.id === recordId);
    if (recordIndex !== -1) {
      data.records[recordIndex] = { ...data.records[recordIndex], ...recordData };
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 删除记录
   */
  deleteRecord(recordId) {
    const data = this.getData();
    data.records = data.records.filter(r => r.id !== recordId);
    this.saveData(data);
    return true;
  }

  // ==================== 评价相关 ====================

  /**
   * 获取评价列表
   */
  getEvaluations(filters = {}) {
    const data = this.getData();
    let evaluations = [...data.evaluations];

    if (filters.evaluateeId) {
      evaluations = evaluations.filter(e => e.evaluateeId === filters.evaluateeId);
    }
    if (filters.evaluatorId) {
      evaluations = evaluations.filter(e => e.evaluatorId === filters.evaluatorId);
    }
    if (filters.projectId) {
      evaluations = evaluations.filter(e => e.projectId === filters.projectId);
    }
    if (filters.type) {
      evaluations = evaluations.filter(e => e.type === filters.type);
    }

    return evaluations;
  }

  /**
   * 根据ID获取评价
   */
  getEvaluationById(evaluationId) {
    const data = this.getData();
    return data.evaluations.find(e => e.id === evaluationId);
  }

  /**
   * 创建评价
   */
  createEvaluation(evaluation) {
    const data = this.getData();
    const currentUser = this.getCurrentUser();
    
    // 计算总分
    let totalScore = 0;
    for (const [dimension, score] of Object.entries(evaluation.dimensions)) {
      const config = EVALUATE_DIMENSION_CONFIG[dimension];
      if (config) {
        totalScore += score * config.weight;
      }
    }

    const newEvaluation = {
      id: 'eval_' + Date.now(),
      evaluatorId: currentUser.id,
      ...evaluation,
      totalScore: Math.round(totalScore * 10) / 10,
      createdAt: new Date().toLocaleString()
    };
    data.evaluations.push(newEvaluation);
    this.saveData(data);
    return newEvaluation;
  }

  /**
   * 计算学生综合得分
   */
  calculateStudentScore(studentId, projectId) {
    const evaluations = this.getEvaluations({ evaluateeId: studentId, projectId });
    if (evaluations.length === 0) return null;

    const typeScores = {};
    evaluations.forEach(evaluation => {
      if (!typeScores[evaluation.type]) {
        typeScores[evaluation.type] = [];
      }
      typeScores[evaluation.type].push(evaluation.totalScore);
    });

    // 教师评价权重40%，企业评价权重40%，同伴互评权重20%
    const weights = { teacher: 0.4, enterprise: 0.4, peer: 0.2 };
    let finalScore = 0;
    let totalWeight = 0;

    for (const [type, scores] of Object.entries(typeScores)) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const weight = weights[type] || 0.2;
      finalScore += avgScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round((finalScore / totalWeight) * 10) / 10 : 0;
  }

  // ==================== 项目相关 ====================

  /**
   * 获取项目列表
   */
  getProjects() {
    const data = this.getData();
    return data.projects;
  }

  /**
   * 推进项目阶段
   */
  advanceProjectPhase(newPhase) {
    const data = this.getData();
    if (data.projects.length > 0) {
      data.projects[0].phase = newPhase;
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 根据ID获取项目
   */
  getProjectById(projectId) {
    const data = this.getData();
    return data.projects.find(p => p.id === projectId);
  }

  // ==================== 统计相关 ====================

  /**
   * 获取任务统计
   */
  getTaskStatistics(projectId) {
    const tasks = this.getTasks({ projectId });
    const stats = {};
    
    Object.values(TASK_STATUS).forEach(status => {
      stats[status] = tasks.filter(t => t.status === status).length;
    });
    
    return {
      total: tasks.length,
      ...stats,
      completionRate: tasks.length > 0 
        ? Math.round((stats[TASK_STATUS.COMPLETED] + stats[TASK_STATUS.APPROVED]) / tasks.length * 100) 
        : 0
    };
  }

  /**
   * 获取工作时长统计
   */
  getWorkDurationStats(userId, projectId) {
    const records = this.getRecords({ userId, projectId });
    const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
    return {
      totalHours: totalDuration,
      recordCount: records.length,
      avgHoursPerDay: records.length > 0 ? Math.round(totalDuration / records.length * 10) / 10 : 0
    };
  }

  // ==================== 项目设置相关 ====================

  /**
   * 更新项目设置
   */
  updateProjectSettings(settings) {
    const data = this.getData();
    if (data.projects.length > 0) {
      data.projects[0] = { ...data.projects[0], ...settings };
      this.saveData(data);
      return true;
    }
    return false;
  }

  // ==================== 通知相关 ====================

  /**
   * 获取用户通知列表
   */
  getNotifications(userId) {
    const data = this.getData();
    if (!data.notifications) {
      data.notifications = [];
      this.saveData(data);
    }
    return data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 创建通知
   */
  createNotification(notification) {
    const data = this.getData();
    if (!data.notifications) {
      data.notifications = [];
    }
    const newNotification = {
      id: 'notification_' + Date.now(),
      ...notification,
      createdAt: new Date().toLocaleString()
    };
    data.notifications.push(newNotification);
    this.saveData(data);
    return newNotification;
  }

  /**
   * 标记通知为已读
   */
  markNotificationRead(notificationId) {
    const data = this.getData();
    if (!data.notifications) return false;
    
    const index = data.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      data.notifications[index].read = true;
      this.saveData(data);
      return true;
    }
    return false;
  }

  /**
   * 标记所有通知为已读
   */
  markAllNotificationsRead(userId) {
    const data = this.getData();
    if (!data.notifications) return false;
    
    data.notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.saveData(data);
    return true;
  }

  /**
   * 删除通知
   */
  deleteNotification(notificationId) {
    const data = this.getData();
    if (!data.notifications) return false;
    
    data.notifications = data.notifications.filter(n => n.id !== notificationId);
    this.saveData(data);
    return true;
  }

  /**
   * 清空用户所有通知
   */
  clearAllNotifications(userId) {
    const data = this.getData();
    if (!data.notifications) return false;
    
    data.notifications = data.notifications.filter(n => n.userId !== userId);
    this.saveData(data);
    return true;
  }
}

// 创建全局数据管理器实例（旧版，保留兼容）
const legacyDataManager = new DataManager();
