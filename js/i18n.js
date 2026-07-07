/**
 * 国际化（i18n）系统
 * 支持中文、英文、日文
 */

// ==================== 翻译数据 ====================
const translations = {
  zh: {
    // 通用
    appName: '软件实训管理系统',
    appFullName: '软件实训全流程管理与评价系统',
    version: 'v2.0',
    
    // 登录页
    loginTitle: '软件实训管理系统',
    loginSubtitle: '全流程管理与评价系统',
    username: '用户名',
    password: '密码',
    usernamePlaceholder: '请输入用户名',
    passwordPlaceholder: '请输入密码',
    loginButton: '登 录',
    loginFooter: '软件实训全流程管理与评价系统 v2.0',
    demoAccounts: '演示账号',
    adminAccount: '管理员：admin / admin123',
    teacherAccount: '教师：teacher01 / teacher123',
    studentAccount: '学生：student01 / student123',
    enterpriseAccount: '企业导师：enterprise01 / enterprise123',
    
    // 导航栏
    navDashboard: '仪表盘',
    navTasks: '任务管理',
    navMaterials: '实训材料',
    navRecords: '过程记录',
    navEvaluate: '评价系统',
    navFlow: '流程管理',
    navCodeRepos: '代码仓库',
    navUsers: '用户管理',
    navSettings: '系统配置',
    navExport: '数据导出',
    navNotifications: '通知消息',
    logout: '退出',
    
    // 仪表盘
    dashboardTitle: '仪表盘',
    dashboardSubtitle: '欢迎回来，查看系统概览',
    totalTasks: '任务总数',
    completedTasks: '已完成',
    pendingTasks: '待处理',
    completionRate: '完成率',
    recentTasks: '最近任务',
    taskDistribution: '任务分布',
    weeklyTrend: '本周趋势',
    noTasks: '暂无任务',
    
    // 任务管理
    tasksTitle: '任务管理',
    tasksSubtitle: '管理和跟踪实训任务',
    newTask: '新建任务',
    taskName: '任务名称',
    taskStatus: '状态',
    taskPriority: '优先级',
    taskDeadline: '截止日期',
    taskAssignee: '负责人',
    taskActions: '操作',
    edit: '编辑',
    delete: '删除',
    view: '查看',
    
    // 状态
    statusPending: '待开始',
    statusInProgress: '进行中',
    statusSubmitted: '已提交',
    statusReviewing: '审核中',
    statusApproved: '已通过',
    statusRejected: '已驳回',
    statusCompleted: '已完成',
    
    // 优先级
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
    
    // 通用操作
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    search: '搜索',
    filter: '筛选',
    export: '导出',
    import: '导入',
    refresh: '刷新',
    loading: '加载中...',
    noData: '暂无数据',
    
    // 消息
    loginSuccess: '登录成功',
    loginFailed: '登录失败，请检查用户名和密码',
    logoutSuccess: '已退出登录',
    saveSuccess: '保存成功',
    deleteSuccess: '删除成功',
    deleteConfirm: '确定要删除吗？',
    operationSuccess: '操作成功',
    operationFailed: '操作失败',
    
    // 语言切换
    language: '语言',
    chinese: '中文',
    english: 'English',
    japanese: '日本語',
    
    // 评价系统
    evaluateTitle: '评价系统',
    evaluateSubtitle: '查看和管理评价信息',
    score: '评分',
    comment: '评语',
    submitEvaluation: '提交评价',
    
    // 流程管理
    flowTitle: '流程管理',
    flowSubtitle: '查看实训流程进度',
    currentStep: '当前步骤',
    stepCompleted: '已完成',
    stepPending: '待完成',
    
    // 用户管理
    usersTitle: '用户管理',
    usersSubtitle: '管理系统用户',
    addUser: '添加用户',
    userName: '姓名',
    userRole: '角色',
    userEmail: '邮箱',
    userActions: '操作',
    
    // 系统配置
    settingsTitle: '系统配置',
    settingsSubtitle: '管理系统设置',
    generalSettings: '基本设置',
    notificationSettings: '通知设置',
    securitySettings: '安全设置',
    
    // 数据导出
    exportTitle: '数据导出',
    exportSubtitle: '导出系统数据',
    exportTasks: '导出任务数据',
    exportUsers: '导出用户数据',
    exportRecords: '导出记录数据',
    exportFormat: '导出格式',
    startExport: '开始导出',
    
    // 通知消息
    notificationsTitle: '通知消息',
    notificationsSubtitle: '查看系统通知',
    markAllRead: '全部标为已读',
    clearAll: '清空所有',
    noNotifications: '暂无通知',
    read: '已读',
    unread: '未读',
    
    // 时间
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    thisMonth: '本月',
    
    // 角色
    roleAdmin: '管理员',
    roleTeacher: '教师',
    roleStudent: '学生',
    roleEnterprise: '企业导师'
  },
  
  en: {
    // General
    appName: 'Training Management System',
    appFullName: 'Software Training Full Process Management & Evaluation System',
    version: 'v2.0',
    
    // Login
    loginTitle: 'Training Management',
    loginSubtitle: 'Full Process Management & Evaluation System',
    username: 'Username',
    password: 'Password',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Sign In',
    loginFooter: 'Software Training Management System v2.0',
    demoAccounts: 'Demo Accounts',
    adminAccount: 'Admin: admin / admin123',
    teacherAccount: 'Teacher: teacher01 / teacher123',
    studentAccount: 'Student: student01 / student123',
    enterpriseAccount: 'Mentor: enterprise01 / enterprise123',
    
    // Navigation
    navDashboard: 'Dashboard',
    navTasks: 'Tasks',
    navMaterials: 'Materials',
    navRecords: 'Records',
    navEvaluate: 'Evaluation',
    navFlow: 'Workflow',
    navCodeRepos: 'Code Repos',
    navUsers: 'Users',
    navSettings: 'Settings',
    navExport: 'Export',
    navNotifications: 'Notifications',
    logout: 'Logout',
    
    // Dashboard
    dashboardTitle: 'Dashboard',
    dashboardSubtitle: 'Welcome back, view system overview',
    totalTasks: 'Total Tasks',
    completedTasks: 'Completed',
    pendingTasks: 'Pending',
    completionRate: 'Completion Rate',
    recentTasks: 'Recent Tasks',
    taskDistribution: 'Task Distribution',
    weeklyTrend: 'Weekly Trend',
    noTasks: 'No tasks yet',
    
    // Tasks
    tasksTitle: 'Task Management',
    tasksSubtitle: 'Manage and track training tasks',
    newTask: 'New Task',
    taskName: 'Task Name',
    taskStatus: 'Status',
    taskPriority: 'Priority',
    taskDeadline: 'Deadline',
    taskAssignee: 'Assignee',
    taskActions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    
    // Status
    statusPending: 'Pending',
    statusInProgress: 'In Progress',
    statusSubmitted: 'Submitted',
    statusReviewing: 'Reviewing',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusCompleted: 'Completed',
    
    // Priority
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    
    // Common Actions
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No data',
    
    // Messages
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed, please check username and password',
    logoutSuccess: 'Logged out successfully',
    saveSuccess: 'Saved successfully',
    deleteSuccess: 'Deleted successfully',
    deleteConfirm: 'Are you sure you want to delete?',
    operationSuccess: 'Operation successful',
    operationFailed: 'Operation failed',
    
    // Language
    language: 'Language',
    chinese: '中文',
    english: 'English',
    japanese: '日本語',
    
    // Evaluation
    evaluateTitle: 'Evaluation System',
    evaluateSubtitle: 'View and manage evaluations',
    score: 'Score',
    comment: 'Comment',
    submitEvaluation: 'Submit Evaluation',
    
    // Workflow
    flowTitle: 'Workflow Management',
    flowSubtitle: 'View training workflow progress',
    currentStep: 'Current Step',
    stepCompleted: 'Completed',
    stepPending: 'Pending',
    
    // Users
    usersTitle: 'User Management',
    usersSubtitle: 'Manage system users',
    addUser: 'Add User',
    userName: 'Name',
    userRole: 'Role',
    userEmail: 'Email',
    userActions: 'Actions',
    
    // Settings
    settingsTitle: 'System Settings',
    settingsSubtitle: 'Manage system settings',
    generalSettings: 'General Settings',
    notificationSettings: 'Notification Settings',
    securitySettings: 'Security Settings',
    
    // Export
    exportTitle: 'Data Export',
    exportSubtitle: 'Export system data',
    exportTasks: 'Export Tasks',
    exportUsers: 'Export Users',
    exportRecords: 'Export Records',
    exportFormat: 'Export Format',
    startExport: 'Start Export',
    
    // Notifications
    notificationsTitle: 'Notifications',
    notificationsSubtitle: 'View system notifications',
    markAllRead: 'Mark All Read',
    clearAll: 'Clear All',
    noNotifications: 'No notifications',
    read: 'Read',
    unread: 'Unread',
    
    // Time
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    
    // Roles
    roleAdmin: 'Admin',
    roleTeacher: 'Teacher',
    roleStudent: 'Student',
    roleEnterprise: 'Mentor'
  },
  
  ja: {
    // 一般
    appName: 'トレーニング管理システム',
    appFullName: 'ソフトウェアトレーニング全流程管理・評価システム',
    version: 'v2.0',
    
    // ログイン
    loginTitle: 'トレーニング管理',
    loginSubtitle: '全流程管理・評価システム',
    username: 'ユーザー名',
    password: 'パスワード',
    usernamePlaceholder: 'ユーザー名を入力',
    passwordPlaceholder: 'パスワードを入力',
    loginButton: 'ログイン',
    loginFooter: 'ソフトウェアトレーニング管理システム v2.0',
    demoAccounts: 'デモアカウント',
    adminAccount: '管理者：admin / admin123',
    teacherAccount: '教師：teacher01 / teacher123',
    studentAccount: '学生：student01 / student123',
    enterpriseAccount: 'メンター：enterprise01 / enterprise123',
    
    // ナビゲーション
    navDashboard: 'ダッシュボード',
    navTasks: 'タスク管理',
    navMaterials: '教材',
    navRecords: '記録',
    navEvaluate: '評価',
    navFlow: 'ワークフロー',
    navCodeRepos: 'コードリポジトリ',
    navUsers: 'ユーザー',
    navSettings: '設定',
    navExport: 'エクスポート',
    navNotifications: '通知',
    logout: 'ログアウト',
    
    // ダッシュボード
    dashboardTitle: 'ダッシュボード',
    dashboardSubtitle: 'おかえりなさい、システム概要を確認',
    totalTasks: 'タスク合計',
    completedTasks: '完了',
    pendingTasks: '保留中',
    completionRate: '完了率',
    recentTasks: '最近のタスク',
    taskDistribution: 'タスク分布',
    weeklyTrend: '週間トレンド',
    noTasks: 'タスクなし',
    
    // タスク
    tasksTitle: 'タスク管理',
    tasksSubtitle: 'トレーニングタスクの管理と追跡',
    newTask: '新規タスク',
    taskName: 'タスク名',
    taskStatus: 'ステータス',
    taskPriority: '優先度',
    taskDeadline: '締め切り',
    taskAssignee: '担当者',
    taskActions: 'アクション',
    edit: '編集',
    delete: '削除',
    view: '表示',
    
    // ステータス
    statusPending: '保留中',
    statusInProgress: '進行中',
    statusSubmitted: '提出済み',
    statusReviewing: 'レビュー中',
    statusApproved: '承認済み',
    statusRejected: '却下',
    statusCompleted: '完了',
    
    // 優先度
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
    
    // 共通アクション
    save: '保存',
    cancel: 'キャンセル',
    confirm: '確認',
    close: '閉じる',
    search: '検索',
    filter: 'フィルター',
    export: 'エクスポート',
    import: 'インポート',
    refresh: '更新',
    loading: '読み込み中...',
    noData: 'データなし',
    
    // メッセージ
    loginSuccess: 'ログイン成功',
    loginFailed: 'ログイン失敗、ユーザー名とパスワードを確認してください',
    logoutSuccess: 'ログアウトしました',
    saveSuccess: '保存しました',
    deleteSuccess: '削除しました',
    deleteConfirm: '削除してもよろしいですか？',
    operationSuccess: '操作成功',
    operationFailed: '操作失敗',
    
    // 言語
    language: '言語',
    chinese: '中文',
    english: 'English',
    japanese: '日本語',
    
    // 評価
    evaluateTitle: '評価システム',
    evaluateSubtitle: '評価情報の表示と管理',
    score: 'スコア',
    comment: 'コメント',
    submitEvaluation: '評価を提出',
    
    // ワークフロー
    flowTitle: 'ワークフロー管理',
    flowSubtitle: 'トレーニングワークフローの進捗確認',
    currentStep: '現在のステップ',
    stepCompleted: '完了',
    stepPending: '保留中',
    
    // ユーザー
    usersTitle: 'ユーザー管理',
    usersSubtitle: 'システムユーザーの管理',
    addUser: 'ユーザー追加',
    userName: '名前',
    userRole: '役割',
    userEmail: 'メール',
    userActions: 'アクション',
    
    // 設定
    settingsTitle: 'システム設定',
    settingsSubtitle: 'システム設定の管理',
    generalSettings: '基本設定',
    notificationSettings: '通知設定',
    securitySettings: 'セキュリティ設定',
    
    // エクスポート
    exportTitle: 'データエクスポート',
    exportSubtitle: 'システムデータのエクスポート',
    exportTasks: 'タスクデータ',
    exportUsers: 'ユーザーデータ',
    exportRecords: '記録データ',
    exportFormat: 'エクスポート形式',
    startExport: 'エクスポート開始',
    
    // 通知
    notificationsTitle: '通知',
    notificationsSubtitle: 'システム通知の確認',
    markAllRead: 'すべて既読にする',
    clearAll: 'すべてクリア',
    noNotifications: '通知なし',
    read: '既読',
    unread: '未読',
    
    // 時間
    today: '今日',
    yesterday: '昨日',
    thisWeek: '今週',
    thisMonth: '今月',
    
    // 役割
    roleAdmin: '管理者',
    roleTeacher: '教師',
    roleStudent: '学生',
    roleEnterprise: 'メンター'
  }
};

// ==================== i18n 管理器 ====================
class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'zh';
    this.listeners = [];
  }
  
  /**
   * 获取翻译文本
   * @param {string} key - 翻译键名
   * @returns {string} 翻译后的文本
   */
  t(key) {
    const lang = translations[this.currentLang];
    return lang && lang[key] !== undefined ? lang[key] : key;
  }
  
  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getLanguage() {
    return this.currentLang;
  }
  
  /**
   * 设置语言
   * @param {string} lang - 语言代码（zh/en/ja）
   */
  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
      this.notifyListeners();
      this.updatePageTranslations();
    }
  }
  
  /**
   * 添加语言变更监听器
   * @param {Function} listener - 监听器函数
   */
  onLanguageChange(listener) {
    this.listeners.push(listener);
  }
  
  /**
   * 通知所有监听器
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLang));
  }
  
  /**
   * 更新页面翻译
   */
  updatePageTranslations() {
    // 更新带有 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.hasAttribute('placeholder')) {
          element.placeholder = translation;
        } else {
          element.value = translation;
        }
      } else {
        element.textContent = translation;
      }
    });
    
    // 更新带有 data-i18n-placeholder 属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.t(key);
    });
    
    // 更新页面标题
    document.title = this.t('appFullName');
    
    // 更新 meta 描述
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = this.t('appFullName');
    }
  }
  
  /**
   * 获取语言显示名称
   * @param {string} lang - 语言代码
   * @returns {string} 语言显示名称
   */
  getLanguageName(lang) {
    const names = {
      zh: '中文',
      en: 'English',
      ja: '日本語'
    };
    return names[lang] || lang;
  }
  
  /**
   * 获取所有可用语言
   * @returns {Array} 语言列表
   */
  getAvailableLanguages() {
    return [
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' }
    ];
  }
}

// 创建全局 i18n 实例
const i18n = new I18nManager();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18n, translations };
}
