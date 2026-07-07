/**
 * API服务层 - 处理与后端的通信
 */

// API基础配置
const API_CONFIG = {
    baseURL: 'http://localhost:8080/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// 当前用户信息和Token
let currentUser = null;
let authToken = null;

/**
 * 设置认证Token
 */
function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

/**
 * 获取认证Token
 */
function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('authToken');
    }
    return authToken;
}

/**
 * 设置当前用户
 */
function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}

/**
 * 获取当前用户
 */
function getCurrentUser() {
    if (!currentUser) {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
        }
    }
    return currentUser;
}

/**
 * 设置当前用户ID（兼容旧代码）
 */
function setCurrentUserId(userId) {
    if (currentUser) {
        currentUser.id = userId;
    }
}

/**
 * 获取当前用户ID（兼容旧代码）
 */
function getCurrentUserId() {
    return currentUser?.id;
}

/**
 * 通用API请求方法
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            ...API_CONFIG.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        // 处理401/403未授权错误（排除登录接口）
        if ((response.status === 401 || response.status === 403) && !endpoint.includes('/auth/login')) {
            console.warn('API认证失败(' + response.status + ')，使用本地模式');
            return { success: false, message: '后端认证失败，使用本地数据' };
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn('API请求失败: ' + (errorData.message || response.status));
            return { success: false, message: errorData.message || '请求失败' };
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

/**
 * 文件上传API
 */
async function uploadFile(file, requestData) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request', new Blob([JSON.stringify(requestData)], {
        type: 'application/json'
    }));
    
    const token = getAuthToken();
    const user = getCurrentUser();
    const response = await fetch(`${API_CONFIG.baseURL}/materials/submit`, {
        method: 'POST',
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(user?.id ? { 'X-User-Id': String(user.id) } : {})
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '文件上传失败');
    }
    
    return await response.json();
}

/**
 * 认证API
 */
const AuthAPI = {
    // 模拟用户数据
    MOCK_USERS: {
        'admin': { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin', email: 'admin@training.com' },
        'teacher01': { id: 2, username: 'teacher01', password: 'teacher123', name: '张老师', role: 'teacher', email: 'teacher@training.com' },
        'student01': { id: 3, username: 'student01', password: 'student123', name: '李同学', role: 'student', email: 'student@training.com' },
        'enterprise01': { id: 4, username: 'enterprise01', password: 'enterprise123', name: '王工程师', role: 'enterprise', email: 'enterprise@training.com' }
    },
    
    // 用户登录
    login: async (username, password) => {
        try {
            // 先尝试调用后端API
            const response = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                setCurrentUser(response.data.user);
            }
            
            return response;
        } catch (error) {
            console.warn('后端API不可用，使用本地模拟登录:', error.message);
            
            // 后端不可用时，使用本地模拟登录
            const mockUser = AuthAPI.MOCK_USERS[username];
            if (mockUser && mockUser.password === password) {
                const { password: _, ...userInfo } = mockUser;
                const mockToken = 'mock-token-' + Date.now();
                
                setAuthToken(mockToken);
                setCurrentUser(userInfo);
                
                return {
                    success: true,
                    message: '登录成功（本地模式）',
                    data: {
                        token: mockToken,
                        user: userInfo
                    }
                };
            }
            
            return {
                success: false,
                message: '用户名或密码错误'
            };
        }
    },
    
    // 用户注册
    register: async (userData) => {
        try {
            return await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        } catch (error) {
            return { success: false, message: '注册失败：后端服务不可用' };
        }
    },
    
    // 修改密码
    changePassword: async (userId, oldPassword, newPassword) => {
        try {
            const params = new URLSearchParams({
                userId,
                oldPassword,
                newPassword
            });
            return await apiRequest(`/auth/change-password?${params}`, {
                method: 'PUT'
            });
        } catch (error) {
            return { success: false, message: '修改密码失败：后端服务不可用' };
        }
    },
    
    // 退出登录
    logout: () => {
        setAuthToken(null);
        setCurrentUser(null);
    }
};

/**
 * 实训材料API
 */
const MaterialAPI = {
    // 提交材料
    submit: (file, requestData) => uploadFile(file, requestData),
    
    // 获取用户材料列表
    getUserMaterials: (userId) => apiRequest(`/materials/user/${userId}`),
    
    // 获取任务材料列表
    getTaskMaterials: (taskId) => apiRequest(`/materials/task/${taskId}`),
    
    // 获取材料详情
    getMaterial: (materialId) => apiRequest(`/materials/${materialId}`),
    
    // 更新材料状态
    updateStatus: (materialId, status, reviewerId, comment) => {
        const params = new URLSearchParams({
            status: status,
            reviewerId: reviewerId
        });
        if (comment) {
            params.append('comment', comment);
        }
        return apiRequest(`/materials/${materialId}/status?${params}`, {
            method: 'PUT'
        });
    }
};

/**
 * AI评审API
 */
const AiReviewAPI = {
    // 获取材料的AI评审记录
    getMaterialReviews: (materialId) => apiRequest(`/ai-reviews/material/${materialId}`),
    
    // 获取用户平均AI评分
    getUserAverageScore: (userId) => apiRequest(`/ai-reviews/user/${userId}/average-score`),
    
    // 测试AI代码评审
    reviewCode: (code, language) => apiRequest('/ai-reviews/review-code', {
        method: 'POST',
        body: JSON.stringify({ code, language })
    }),
    
    // 使用自定义评审标准进行代码评审
    reviewCodeWithCriteria: (code, language, criteriaId) => apiRequest('/ai-reviews/review-code-with-criteria', {
        method: 'POST',
        body: JSON.stringify({ code, language, criteriaId })
    }),
    
    // 获取AI学习建议
    getLearningAdvice: (studentName, taskTitle, currentProgress) => apiRequest('/ai-reviews/learning-advice', {
        method: 'POST',
        body: JSON.stringify({ studentName, taskTitle, currentProgress })
    })
};

/**
 * 评审标准API
 */
const ReviewCriteriaAPI = {
    // 获取所有评审标准
    getAll: () => apiRequest('/review-criteria'),
    
    // 根据ID获取评审标准
    getById: (id) => apiRequest(`/review-criteria/${id}`),
    
    // 创建评审标准
    create: (criteriaData) => apiRequest('/review-criteria', {
        method: 'POST',
        body: JSON.stringify(criteriaData)
    }),
    
    // 更新评审标准
    update: (id, criteriaData) => apiRequest(`/review-criteria/${id}`, {
        method: 'PUT',
        body: JSON.stringify(criteriaData)
    }),
    
    // 删除评审标准
    delete: (id) => apiRequest(`/review-criteria/${id}`, {
        method: 'DELETE'
    }),
    
    // 根据项目ID获取评审标准
    getByProject: (projectId) => apiRequest(`/review-criteria/project/${projectId}`),
    
    // 根据任务ID获取评审标准
    getByTask: (taskId) => apiRequest(`/review-criteria/task/${taskId}`),
    
    // 根据难度级别获取评审标准
    getByDifficulty: (difficultyLevel) => apiRequest(`/review-criteria/difficulty/${difficultyLevel}`),
    
    // 根据标准类型获取评审标准
    getByType: (criteriaType) => apiRequest(`/review-criteria/type/${criteriaType}`),
    
    // 搜索评审标准
    search: (keyword) => apiRequest(`/review-criteria/search?keyword=${encodeURIComponent(keyword)}`),
    
    // 获取全局评审标准
    getGlobal: () => apiRequest('/review-criteria/global'),
    
    // 获取适合材料的评审标准
    getForMaterial: (materialId) => apiRequest(`/review-criteria/material/${materialId}`)
};

/**
 * 任务API
 */
const TaskAPI = {
    // 创建任务
    create: (taskData, creatorId, projectId) => {
        const params = new URLSearchParams({ creatorId });
        if (projectId) {
            params.append('projectId', projectId);
        }
        return apiRequest(`/tasks?${params}`, {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    },
    
    // 分配任务
    assign: (taskId, userId) => apiRequest(`/tasks/${taskId}/assign?userId=${userId}`, {
        method: 'PUT'
    }),
    
    // 提交任务
    submit: (taskId) => apiRequest(`/tasks/${taskId}/submit`, {
        method: 'PUT'
    }),
    
    // 审核任务
    review: (taskId, status, comment) => {
        const params = new URLSearchParams({ status });
        if (comment) {
            params.append('comment', comment);
        }
        return apiRequest(`/tasks/${taskId}/review?${params}`, {
            method: 'PUT'
        });
    },
    
    // 获取用户任务列表
    getUserTasks: (userId) => apiRequest(`/tasks/user/${userId}`),
    
    // 获取项目任务列表
    getProjectTasks: (projectId) => apiRequest(`/tasks/project/${projectId}`),
    
    // 获取任务详情
    getTask: (taskId) => apiRequest(`/tasks/${taskId}`),
    
    // 更新任务进度
    updateProgress: (taskId, actualHours) => apiRequest(`/tasks/${taskId}/progress?actualHours=${actualHours}`, {
        method: 'PUT'
    }),
    
    // 获取任务统计
    getStatistics: (userId) => apiRequest(`/tasks/user/${userId}/statistics`),
    
    // 删除任务
    delete: (taskId) => apiRequest(`/tasks/${taskId}`, {
        method: 'DELETE'
    })
};

/**
 * 项目API
 */
const ProjectAPI = {
    // 创建项目
    create: (projectData, creatorId) => apiRequest(`/projects?creatorId=${creatorId}`, {
        method: 'POST',
        body: JSON.stringify(projectData)
    }),
    
    // 更新项目状态
    updateStatus: (projectId, status) => apiRequest(`/projects/${projectId}/status?status=${status}`, {
        method: 'PUT'
    }),
    
    // 更新项目阶段
    updatePhase: (projectId, phase) => apiRequest(`/projects/${projectId}/phase?phase=${phase}`, {
        method: 'PUT'
    }),
    
    // 获取项目列表
    getProjects: () => apiRequest('/projects'),
    
    // 获取用户项目列表
    getUserProjects: (userId) => apiRequest(`/projects/user/${userId}`),
    
    // 获取项目详情
    getProject: (projectId) => apiRequest(`/projects/${projectId}`),
    
    // 获取项目统计
    getStatistics: (projectId) => apiRequest(`/projects/${projectId}/statistics`)
};

/**
 * 用户API
 */
const UserAPI = {
    // 获取用户信息
    getUser: (userId) => apiRequest(`/users/${userId}`),
    
    // 获取用户列表
    getUsers: () => apiRequest('/users')
};

/**
 * 数据转换工具
 */
const DataConverter = {
    // 转换材料数据为前端格式
    convertMaterial: (apiMaterial) => ({
        id: apiMaterial.id,
        title: apiMaterial.title,
        description: apiMaterial.description,
        type: apiMaterial.materialType,
        typeName: apiMaterial.materialTypeDescription,
        fileName: apiMaterial.fileName,
        fileSize: apiMaterial.fileSize,
        fileType: apiMaterial.fileType,
        version: apiMaterial.version,
        status: apiMaterial.status,
        statusName: apiMaterial.statusDescription,
        submitterId: apiMaterial.submittedById,
        submitterName: apiMaterial.submittedByName,
        taskId: apiMaterial.taskId,
        taskTitle: apiMaterial.taskTitle,
        aiScore: apiMaterial.aiScore,
        aiFeedback: apiMaterial.aiFeedback,
        reviewedBy: apiMaterial.reviewedBy,
        reviewedByName: apiMaterial.reviewedByName,
        reviewedAt: apiMaterial.reviewedAt,
        reviewComment: apiMaterial.reviewComment,
        createdAt: apiMaterial.createdAt,
        updatedAt: apiMaterial.updatedAt
    }),
    
    // 转换任务数据为前端格式
    convertTask: (apiTask) => ({
        id: apiTask.id,
        title: apiTask.title,
        description: apiTask.description,
        projectId: apiTask.project?.id,
        projectName: apiTask.project?.name,
        assignedToId: apiTask.assignedTo?.id,
        assignedToName: apiTask.assignedTo?.name,
        createdById: apiTask.createdBy?.id,
        createdByName: apiTask.createdBy?.name,
        status: apiTask.status,
        priority: apiTask.priority,
        dueDate: apiTask.dueDate,
        startedAt: apiTask.startedAt,
        completedAt: apiTask.completedAt,
        estimatedHours: apiTask.estimatedHours,
        actualHours: apiTask.actualHours,
        createdAt: apiTask.createdAt,
        updatedAt: apiTask.updatedAt
    }),
    
    // 转换项目数据为前端格式
    convertProject: (apiProject) => ({
        id: apiProject.id,
        name: apiProject.name,
        description: apiProject.description,
        createdById: apiProject.createdBy?.id,
        createdByName: apiProject.createdBy?.name,
        startDate: apiProject.startDate,
        endDate: apiProject.endDate,
        status: apiProject.status,
        currentPhase: apiProject.currentPhase,
        createdAt: apiProject.createdAt,
        updatedAt: apiProject.updatedAt
    })
};

/**
 * 学习路径API
 */
const LearningPathAPI = {
    // 获取学生的所有学习路径
    getByStudent: (studentId) => apiRequest(`/learning-paths/student/${studentId}`),
    
    // 获取学生指定状态的学习路径
    getByStudentAndStatus: (studentId, status) => apiRequest(`/learning-paths/student/${studentId}/status/${status}`),
    
    // 根据ID获取学习路径
    getById: (id) => apiRequest(`/learning-paths/${id}`),
    
    // 创建学习路径
    create: (pathData) => apiRequest('/learning-paths', {
        method: 'POST',
        body: JSON.stringify(pathData)
    }),
    
    // 更新学习路径状态
    updateStatus: (id, status) => apiRequest(`/learning-paths/${id}/status?status=${status}`, {
        method: 'PUT'
    }),
    
    // 更新学习步骤状态
    updateStepStatus: (stepId, status) => apiRequest(`/learning-paths/steps/${stepId}/status?status=${status}`, {
        method: 'PUT'
    }),
    
    // 删除学习路径
    delete: (id) => apiRequest(`/learning-paths/${id}`, {
        method: 'DELETE'
    }),
    
    // 使用AI生成学习路径
    generate: (requestData) => apiRequest('/learning-paths/generate', {
        method: 'POST',
        body: JSON.stringify(requestData)
    }),
    
    // 获取学生的学习路径统计
    getStatistics: (studentId) => apiRequest(`/learning-paths/student/${studentId}/statistics`)
};

// 导出API对象
window.API = {
    AuthAPI,
    MaterialAPI,
    AiReviewAPI,
    ReviewCriteriaAPI,
    TaskAPI,
    ProjectAPI,
    UserAPI,
    LearningPathAPI,
    DataConverter,
    setCurrentUserId,
    getCurrentUserId,
    setCurrentUser,
    getCurrentUser,
    setAuthToken,
    getAuthToken
};
