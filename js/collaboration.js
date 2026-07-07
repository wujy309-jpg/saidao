/**
 * 多端协作模块 - 实现管理员、指导教师、学生、企业导师之间的连通
 * 功能：代码评审、通知系统、活动日志
 */

// ==================== 数据模型 ====================

// 代码评审状态
const REVIEW_STATUS = {
  PENDING: 'pending',      // 待评审
  IN_REVIEW: 'in_review',  // 评审中
  APPROVED: 'approved',    // 已通过
  REJECTED: 'rejected',    // 已驳回
  REVISED: 'revised'       // 已修改
};

// 评审类型
const REVIEW_TYPE = {
  CODE_REVIEW: 'code_review',       // 代码评审
  DOCUMENT_REVIEW: 'document_review', // 文档评审
  TASK_REVIEW: 'task_review',        // 任务评审
  MATERIAL_REVIEW: 'material_review'  // 材料评审
};

// 通知类型
const NOTIFICATION_TYPE = {
  REVIEW_RECEIVED: 'review_received',     // 收到评审
  REVIEW_REPLIED: 'review_replied',       // 评审回复
  TASK_ASSIGNED: 'task_assigned',         // 任务分配
  TASK_STATUS_CHANGED: 'task_status_changed', // 任务状态变更
  MENTION: 'mention',                     // 被提及
  SYSTEM: 'system'                        // 系统通知
};

// 活动类型
const ACTIVITY_TYPE = {
  CODE_COMMIT: 'code_commit',           // 代码提交
  CODE_REVIEW: 'code_review',           // 代码评审
  TASK_CREATED: 'task_created',         // 任务创建
  TASK_UPDATED: 'task_updated',         // 任务更新
  TASK_COMPLETED: 'task_completed',      // 任务完成
  RECORD_CREATED: 'record_created',     // 记录创建
  EVALUATION_SUBMITTED: 'evaluation_submitted', // 评价提交
  MATERIAL_UPLOADED: 'material_uploaded', // 材料上传
  MEMBER_JOINED: 'member_joined',       // 成员加入
  COMMENT_ADDED: 'comment_added'        // 评论添加
};

// ==================== 协作数据管理器 ====================

function getCollaborationManager() {
  return {
    _getData() {
      const data = localStorage.getItem('collaboration_data');
      if (!data) {
        const initialData = {
          reviews: [],
          notifications: [],
          activities: [],
          comments: []
        };
        localStorage.setItem('collaboration_data', JSON.stringify(initialData));
        return initialData;
      }
      return JSON.parse(data);
    },

    _save(data) {
      localStorage.setItem('collaboration_data', JSON.stringify(data));
    },

    // ==================== 代码评审 ====================

    // 创建代码评审
    createReview(reviewData) {
      const d = this._getData();
      const currentUser = dataManager.getCurrentUser();
      
      const review = {
        id: 'review_' + Date.now(),
        ...reviewData,
        reviewerId: currentUser.id,
        reviewerName: currentUser.name,
        reviewerRole: currentUser.role,
        status: REVIEW_STATUS.PENDING,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      };
      
      d.reviews.push(review);
      this._save(d);
      
      // 发送通知给被评审人
      this.createNotification({
        userId: reviewData.targetUserId,
        type: NOTIFICATION_TYPE.REVIEW_RECEIVED,
        title: '收到新的代码评审',
        content: `${currentUser.name} 对您的代码提交了评审建议`,
        relatedId: review.id,
        relatedType: 'review',
        senderId: currentUser.id,
        senderName: currentUser.name
      });
      
      // 记录活动
      this.createActivity({
        type: ACTIVITY_TYPE.CODE_REVIEW,
        userId: currentUser.id,
        userName: currentUser.name,
        targetId: reviewData.targetUserId,
        targetName: reviewData.targetUserName,
        description: `对 ${reviewData.targetUserName} 的代码提交了评审`,
        relatedId: review.id,
        repoId: reviewData.repoId,
        filePath: reviewData.filePath
      });
      
      return review;
    },

    // 获取评审列表
    getReviews(filters = {}) {
      const d = this._getData();
      let reviews = [...d.reviews];
      
      if (filters.targetUserId) {
        reviews = reviews.filter(r => String(r.targetUserId) === String(filters.targetUserId));
      }
      if (filters.reviewerId) {
        reviews = reviews.filter(r => String(r.reviewerId) === String(filters.reviewerId));
      }
      if (filters.repoId) {
        reviews = reviews.filter(r => r.repoId === filters.repoId);
      }
      if (filters.status) {
        reviews = reviews.filter(r => r.status === filters.status);
      }
      if (filters.type) {
        reviews = reviews.filter(r => r.type === filters.type);
      }
      
      return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // 获取单个评审
    getReview(reviewId) {
      const d = this._getData();
      return d.reviews.find(r => r.id === reviewId);
    },

    // 回复评审
    replyToReview(reviewId, content) {
      const d = this._getData();
      const currentUser = dataManager.getCurrentUser();
      const reviewIndex = d.reviews.findIndex(r => r.id === reviewId);
      
      if (reviewIndex === -1) return null;
      
      const review = d.reviews[reviewIndex];
      
      // 添加回复
      if (!review.replies) review.replies = [];
      review.replies.push({
        id: 'reply_' + Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        content: content,
        createdAt: new Date().toLocaleString()
      });
      
      review.status = REVIEW_STATUS.REVISED;
      review.updatedAt = new Date().toLocaleString();
      
      this._save(d);
      
      // 发送通知给评审人
      this.createNotification({
        userId: review.reviewerId,
        type: NOTIFICATION_TYPE.REVIEW_REPLIED,
        title: '评审回复',
        content: `${currentUser.name} 回复了您的评审建议`,
        relatedId: reviewId,
        relatedType: 'review',
        senderId: currentUser.id,
        senderName: currentUser.name
      });
      
      return review;
    },

    // 更新评审状态
    updateReviewStatus(reviewId, status, comment) {
      const d = this._getData();
      const currentUser = dataManager.getCurrentUser();
      const reviewIndex = d.reviews.findIndex(r => r.id === reviewId);
      
      if (reviewIndex === -1) return false;
      
      const review = d.reviews[reviewIndex];
      review.status = status;
      review.updatedAt = new Date().toLocaleString();
      
      if (comment) {
        if (!review.replies) review.replies = [];
        review.replies.push({
          id: 'reply_' + Date.now(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          content: comment,
          type: 'status_change',
          createdAt: new Date().toLocaleString()
        });
      }
      
      this._save(d);
      
      // 发送通知
      this.createNotification({
        userId: review.targetUserId,
        type: NOTIFICATION_TYPE.REVIEW_REPLIED,
        title: `评审${status === REVIEW_STATUS.APPROVED ? '通过' : '驳回'}`,
        content: `${currentUser.name} ${status === REVIEW_STATUS.APPROVED ? '通过' : '驳回'}了您的代码`,
        relatedId: reviewId,
        relatedType: 'review',
        senderId: currentUser.id,
        senderName: currentUser.name
      });
      
      return true;
    },

    // ==================== 通知系统 ====================

    // 创建通知
    createNotification(notificationData) {
      const d = this._getData();
      
      const notification = {
        id: 'notif_' + Date.now(),
        ...notificationData,
        read: false,
        createdAt: new Date().toLocaleString()
      };
      
      d.notifications.push(notification);
      this._save(d);
      
      // 更新通知角标
      this.updateNotificationBadge(notificationData.userId);
      
      return notification;
    },

    // 获取用户通知
    getUserNotifications(userId, filters = {}) {
      const d = this._getData();
      let notifications = d.notifications.filter(n => String(n.userId) === String(userId));
      
      if (filters.read !== undefined) {
        notifications = notifications.filter(n => n.read === filters.read);
      }
      if (filters.type) {
        notifications = notifications.filter(n => n.type === filters.type);
      }
      
      return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // 获取未读通知数量
    getUnreadCount(userId) {
      const d = this._getData();
      return d.notifications.filter(n => String(n.userId) === String(userId) && !n.read).length;
    },

    // 标记通知为已读
    markAsRead(notificationId) {
      const d = this._getData();
      const index = d.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        d.notifications[index].read = true;
        this._save(d);
        this.updateNotificationBadge(d.notifications[index].userId);
        return true;
      }
      return false;
    },

    // 标记所有通知为已读
    markAllAsRead(userId) {
      const d = this._getData();
      d.notifications.forEach(n => {
        if (String(n.userId) === String(userId)) {
          n.read = true;
        }
      });
      this._save(d);
      this.updateNotificationBadge(userId);
    },

    // 删除通知
    deleteNotification(notificationId) {
      const d = this._getData();
      const notification = d.notifications.find(n => n.id === notificationId);
      d.notifications = d.notifications.filter(n => n.id !== notificationId);
      this._save(d);
      if (notification) {
        this.updateNotificationBadge(notification.userId);
      }
    },

    // 更新通知角标
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
    },

    // ==================== 活动日志 ====================

    // 创建活动记录
    createActivity(activityData) {
      const d = this._getData();
      
      const activity = {
        id: 'activity_' + Date.now(),
        ...activityData,
        createdAt: new Date().toLocaleString()
      };
      
      d.activities.push(activity);
      this._save(d);
      
      return activity;
    },

    // 获取活动列表
    getActivities(filters = {}) {
      const d = this._getData();
      let activities = [...d.activities];
      
      if (filters.userId) {
        activities = activities.filter(a => String(a.userId) === String(filters.userId));
      }
      if (filters.type) {
        activities = activities.filter(a => a.type === filters.type);
      }
      if (filters.repoId) {
        activities = activities.filter(a => a.repoId === filters.repoId);
      }
      
      // 限制返回数量
      const limit = filters.limit || 50;
      return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    },

    // 获取用户最近活动
    getUserActivities(userId, limit = 20) {
      return this.getActivities({ userId, limit });
    },

    // ==================== 评论系统 ====================

    // 添加评论
    addComment(commentData) {
      const d = this._getData();
      const currentUser = dataManager.getCurrentUser();
      
      const comment = {
        id: 'comment_' + Date.now(),
        ...commentData,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        createdAt: new Date().toLocaleString()
      };
      
      d.comments.push(comment);
      this._save(d);
      
      // 如果是回复评论，通知原评论人
      if (commentData.parentUserId && String(commentData.parentUserId) !== String(currentUser.id)) {
        this.createNotification({
          userId: commentData.parentUserId,
          type: NOTIFICATION_TYPE.COMMENT_ADDED,
          title: '评论回复',
          content: `${currentUser.name} 回复了您的评论`,
          relatedId: comment.id,
          relatedType: 'comment',
          senderId: currentUser.id,
          senderName: currentUser.name
        });
      }
      
      // 记录活动
      this.createActivity({
        type: ACTIVITY_TYPE.COMMENT_ADDED,
        userId: currentUser.id,
        userName: currentUser.name,
        description: `添加了评论`,
        relatedId: comment.id,
        repoId: commentData.repoId,
        filePath: commentData.filePath
      });
      
      return comment;
    },

    // 获取评论列表
    getComments(filters = {}) {
      const d = this._getData();
      let comments = [...d.comments];
      
      if (filters.repoId) {
        comments = comments.filter(c => c.repoId === filters.repoId);
      }
      if (filters.filePath) {
        comments = comments.filter(c => c.filePath === filters.filePath);
      }
      if (filters.targetUserId) {
        comments = comments.filter(c => String(c.targetUserId) === String(filters.targetUserId));
      }
      
      return comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // ==================== 统计功能 ====================

    // 获取用户协作统计
    getUserCollaborationStats(userId) {
      const d = this._getData();
      
      const reviewsGiven = d.reviews.filter(r => String(r.reviewerId) === String(userId)).length;
      const reviewsReceived = d.reviews.filter(r => String(r.targetUserId) === String(userId)).length;
      const commentsGiven = d.comments.filter(c => String(c.userId) === String(userId)).length;
      const activitiesCount = d.activities.filter(a => String(a.userId) === String(userId)).length;
      
      return {
        reviewsGiven,
        reviewsReceived,
        commentsGiven,
        activitiesCount,
        unreadNotifications: this.getUnreadCount(userId)
      };
    },

    // 获取待处理事项
    getPendingItems(userId) {
      const d = this._getData();
      const currentUser = dataManager.getCurrentUser();
      
      const pendingReviews = d.reviews.filter(r => 
        String(r.targetUserId) === String(userId) && 
        r.status === REVIEW_STATUS.PENDING
      );
      
      const pendingTaskReviews = d.reviews.filter(r => 
        String(r.reviewerId) === String(userId) && 
        r.status === REVIEW_STATUS.PENDING
      );
      
      return {
        pendingReviewsReceived: pendingReviews,
        pendingReviewsToGive: pendingTaskReviews
      };
    }
  };
}

// 创建全局实例
const collaborationMgr = getCollaborationManager();

// ==================== UI 渲染函数 ====================

// 渲染通知中心页面
function renderNotifications() {
  const currentUser = dataManager.getCurrentUser();
  const notifications = collaborationMgr.getUserNotifications(currentUser.id);
  const unreadCount = collaborationMgr.getUnreadCount(currentUser.id);
  
  // 统计各类型通知数量
  const reviewNotifications = notifications.filter(n => n.type === NOTIFICATION_TYPE.REVIEW_RECEIVED || n.type === NOTIFICATION_TYPE.REVIEW_REPLIED);
  const taskNotifications = notifications.filter(n => n.type === NOTIFICATION_TYPE.TASK_ASSIGNED || n.type === NOTIFICATION_TYPE.TASK_STATUS_CHANGED);
  
  return `
    <div class="page-header">
      <h1><i data-lucide="bell" style="width:24px;height:24px;vertical-align:middle;margin-right:8px"></i>通知中心</h1>
      <div class="subtitle">查看系统通知和协作消息</div>
    </div>

    <div class="dashboard-grid">
      <div class="stat-card">
        <div class="icon blue"><i data-lucide="mail"></i></div>
        <div class="info">
          <h3>${notifications.length}</h3>
          <p>通知总数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon orange"><i data-lucide="bell-ring"></i></div>
        <div class="info">
          <h3>${unreadCount}</h3>
          <p>未读通知</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon purple"><i data-lucide="code"></i></div>
        <div class="info">
          <h3>${reviewNotifications.length}</h3>
          <p>代码评审</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="icon green"><i data-lucide="clipboard-list"></i></div>
        <div class="info">
          <h3>${taskNotifications.length}</h3>
          <p>任务通知</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>通知列表</h3>
        <div class="flex gap-2">
          <select class="form-control form-control-sm" id="notification-filter" onchange="filterNotifications()">
            <option value="">全部通知</option>
            <option value="unread">未读通知</option>
            <option value="review_received">收到评审</option>
            <option value="review_replied">评审回复</option>
            <option value="task_assigned">任务分配</option>
            <option value="task_status_changed">任务状态</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="markAllNotificationsRead()">全部已读</button>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div id="notifications-list">
          ${renderNotificationsList(notifications)}
        </div>
      </div>
    </div>
  `;
}

function renderNotificationsList(notifications) {
  if (notifications.length === 0) {
    return `
      <div class="text-center" style="padding:60px 20px">
        <i data-lucide="inbox" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px"></i>
        <h3 style="color:var(--text-secondary)">暂无通知</h3>
        <p style="color:var(--text-muted)">您暂时没有收到任何通知</p>
      </div>
    `;
  }
  
  return notifications.map(notification => {
    const icon = getNotificationIcon(notification.type);
    const timeAgo = getTimeAgo(notification.createdAt);
    
    return `
      <div class="notification-item ${notification.read ? '' : 'unread'}" onclick="handleNotificationClick('${notification.id}')">
        <div class="notification-icon">
          <i data-lucide="${icon}" style="width:20px;height:20px"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-text">${notification.content}</div>
          <div class="notification-meta">
            <span class="notification-sender">${notification.senderName || '系统'}</span>
            <span class="notification-time">${timeAgo}</span>
          </div>
        </div>
        <div class="notification-actions">
          ${!notification.read ? `
            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); markNotificationRead('${notification.id}')">标为已读</button>
          ` : ''}
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteNotification('${notification.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function getNotificationIcon(type) {
  const icons = {
    [NOTIFICATION_TYPE.REVIEW_RECEIVED]: 'code',
    [NOTIFICATION_TYPE.REVIEW_REPLIED]: 'message-square',
    [NOTIFICATION_TYPE.TASK_ASSIGNED]: 'clipboard-list',
    [NOTIFICATION_TYPE.TASK_STATUS_CHANGED]: 'refresh-cw',
    [NOTIFICATION_TYPE.MENTION]: 'at-sign',
    [NOTIFICATION_TYPE.SYSTEM]: 'settings',
    [NOTIFICATION_TYPE.COMMENT_ADDED]: 'message-circle'
  };
  return icons[type] || 'bell';
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + '天前';
  return dateStr.split(' ')[0];
}

// 通知操作函数
function handleNotificationClick(notificationId) {
  const notification = collaborationMgr.getNotification(notificationId);
  if (!notification) return;
  
  // 标记为已读
  collaborationMgr.markAsRead(notificationId);
  
  // 根据通知类型跳转
  if (notification.relatedType === 'review' && notification.relatedId) {
    showReviewDetail(notification.relatedId);
  } else if (notification.relatedType === 'task' && notification.relatedId) {
    showTaskDetail(notification.relatedId);
  }
}

function markNotificationRead(notificationId) {
  collaborationMgr.markAsRead(notificationId);
  navigateTo('notifications');
}

function markAllNotificationsRead() {
  const currentUser = dataManager.getCurrentUser();
  collaborationMgr.markAllAsRead(currentUser.id);
  showToast('所有通知已标为已读', 'success');
  navigateTo('notifications');
}

function deleteNotification(notificationId) {
  collaborationMgr.deleteNotification(notificationId);
  showToast('通知已删除', 'success');
  navigateTo('notifications');
}

function filterNotifications() {
  const filter = document.getElementById('notification-filter')?.value || '';
  const currentUser = dataManager.getCurrentUser();
  
  let notifications;
  if (filter === 'unread') {
    notifications = collaborationMgr.getUserNotifications(currentUser.id, { read: false });
  } else if (filter) {
    notifications = collaborationMgr.getUserNotifications(currentUser.id, { type: filter });
  } else {
    notifications = collaborationMgr.getUserNotifications(currentUser.id);
  }
  
  const listContainer = document.getElementById('notifications-list');
  if (listContainer) {
    listContainer.innerHTML = renderNotificationsList(notifications);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ==================== 代码评审 UI ====================

// 显示代码评审模态框
function showCodeReviewModal(repoId, branch, filePath, targetUserId, targetUserName) {
  const currentUser = dataManager.getCurrentUser();
  
  // 只有教师和企业导师可以发起代码评审
  if (currentUser.role !== 'teacher' && currentUser.role !== 'enterprise' && currentUser.role !== 'admin') {
    showToast('您没有权限发起代码评审', 'error');
    return;
  }
  
  const content = `
    <div class="form-group">
      <label>评审对象</label>
      <input type="text" class="form-control" value="${targetUserName}" disabled>
    </div>
    <div class="form-group">
      <label>文件路径</label>
      <input type="text" class="form-control" value="${filePath}" disabled>
    </div>
    <div class="form-group">
      <label>评审类型</label>
      <select class="form-control" id="review-type">
        <option value="${REVIEW_TYPE.CODE_REVIEW}">代码评审</option>
        <option value="${REVIEW_TYPE.DOCUMENT_REVIEW}">文档评审</option>
      </select>
    </div>
    <div class="form-group">
      <label>评审等级</label>
      <select class="form-control" id="review-level">
        <option value="info">信息</option>
        <option value="suggestion">建议</option>
        <option value="warning">警告</option>
        <option value="critical">严重</option>
      </select>
    </div>
    <div class="form-group">
      <label>评审意见 <span style="color:var(--danger)">*</span></label>
      <textarea class="form-control" id="review-content" rows="6" placeholder="请输入您的评审意见..."></textarea>
    </div>
    <div class="form-group">
      <label>具体代码行号（可选）</label>
      <input type="text" class="form-control" id="review-line" placeholder="例如：10-20">
    </div>
  `;
  
  showModal('代码评审', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="submitCodeReview('${repoId}', '${branch}', '${filePath}', '${targetUserId}', '${targetUserName}')">提交评审</button>
      `;
    }
  }, 100);
}

// 提交代码评审
function submitCodeReview(repoId, branch, filePath, targetUserId, targetUserName) {
  const content = document.getElementById('review-content')?.value.trim();
  const type = document.getElementById('review-type')?.value;
  const level = document.getElementById('review-level')?.value;
  const line = document.getElementById('review-line')?.value.trim();
  
  if (!content) {
    showToast('请输入评审意见', 'error');
    return;
  }
  
  collaborationMgr.createReview({
    repoId,
    branch,
    filePath,
    targetUserId,
    targetUserName,
    type,
    level,
    content,
    line
  });
  
  closeModal();
  showToast('评审已提交', 'success');
}

// 显示评审详情
function showReviewDetail(reviewId) {
  const review = collaborationMgr.getReview(reviewId);
  if (!review) {
    showToast('评审不存在', 'error');
    return;
  }
  
  const reviewer = dataManager.getUserById(review.reviewerId);
  const targetUser = dataManager.getUserById(review.targetUserId);
  const currentUser = dataManager.getCurrentUser();
  const isTargetUser = String(currentUser.id) === String(review.targetUserId);
  
  const levelColors = {
    info: '#3b82f6',
    suggestion: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444'
  };
  
  const levelNames = {
    info: '信息',
    suggestion: '建议',
    warning: '警告',
    critical: '严重'
  };
  
  const statusNames = {
    pending: '待处理',
    in_review: '评审中',
    approved: '已通过',
    rejected: '已驳回',
    revised: '已修改'
  };
  
  let content = `
    <div class="review-detail">
      <div class="review-header" style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border-default)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <span class="badge" style="background:${levelColors[review.level]}20;color:${levelColors[review.level]}">${levelNames[review.level]}</span>
            <span class="badge badge-${review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'danger' : 'warning'}">${statusNames[review.status]}</span>
          </div>
          <span class="text-muted text-sm">${getTimeAgo(review.createdAt)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div class="avatar-sm">${reviewer?.name?.charAt(0) || '?'}</div>
          <div>
            <div class="font-semibold">${reviewer?.name || '未知'}</div>
            <div class="text-muted text-sm">${reviewer?.role === 'teacher' ? '指导教师' : reviewer?.role === 'enterprise' ? '企业导师' : '管理员'}</div>
          </div>
        </div>
        <div class="text-muted text-sm">
          <i data-lucide="file" style="width:12px;height:12px;vertical-align:middle;margin-right:4px"></i>
          ${review.filePath}
          ${review.line ? ` (行 ${review.line})` : ''}
        </div>
      </div>
      
      <div class="review-content" style="background:var(--bg-tertiary);padding:16px;border-radius:var(--radius-md);margin-bottom:16px">
        ${review.content.replace(/\n/g, '<br>')}
      </div>
      
      ${review.replies && review.replies.length > 0 ? `
        <div class="review-replies" style="margin-bottom:16px">
          <h4 style="margin-bottom:12px">回复记录</h4>
          ${review.replies.map(reply => {
            const replyUser = dataManager.getUserById(reply.userId);
            return `
              <div class="reply-item" style="padding:12px;background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <div class="avatar-xs">${replyUser?.name?.charAt(0) || '?'}</div>
                  <span class="font-semibold">${replyUser?.name || '未知'}</span>
                  <span class="text-muted text-sm">${getTimeAgo(reply.createdAt)}</span>
                </div>
                <div>${reply.content.replace(/\n/g, '<br>')}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
      
      ${isTargetUser && review.status !== REVIEW_STATUS.APPROVED ? `
        <div class="review-reply-form">
          <h4 style="margin-bottom:12px">回复评审</h4>
          <textarea class="form-control" id="review-reply-content" rows="4" placeholder="请输入您的回复..."></textarea>
        </div>
      ` : ''}
    </div>
  `;
  
  showModal('评审详情', content);
  
  setTimeout(() => {
    const footer = document.querySelector('.modal-footer');
    if (footer) {
      if (isTargetUser && review.status !== REVIEW_STATUS.APPROVED) {
        footer.innerHTML = `
          <button class="btn btn-outline" onclick="closeModal()">关闭</button>
          <button class="btn btn-primary" onclick="submitReviewReply('${reviewId}')">提交回复</button>
        `;
      } else if (currentUser.role === 'teacher' || currentUser.role === 'enterprise' || currentUser.role === 'admin') {
        if (review.status === REVIEW_STATUS.PENDING || review.status === REVIEW_STATUS.REVISED) {
          footer.innerHTML = `
            <button class="btn btn-outline" onclick="closeModal()">关闭</button>
            <button class="btn btn-danger" onclick="updateReviewStatus('${reviewId}', '${REVIEW_STATUS.REJECTED}')">驳回</button>
            <button class="btn btn-success" onclick="updateReviewStatus('${reviewId}', '${REVIEW_STATUS.APPROVED}')">通过</button>
          `;
        } else {
          footer.innerHTML = '<button class="btn btn-outline" onclick="closeModal()">关闭</button>';
        }
      } else {
        footer.innerHTML = '<button class="btn btn-outline" onclick="closeModal()">关闭</button>';
      }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 100);
}

// 提交评审回复
function submitReviewReply(reviewId) {
  const content = document.getElementById('review-reply-content')?.value.trim();
  if (!content) {
    showToast('请输入回复内容', 'error');
    return;
  }
  
  collaborationMgr.replyToReview(reviewId, content);
  closeModal();
  showToast('回复已提交', 'success');
}

// 更新评审状态
function updateReviewStatus(reviewId, status) {
  const comment = status === REVIEW_STATUS.REJECTED ? prompt('请输入驳回原因：') : '';
  if (status === REVIEW_STATUS.REJECTED && comment === null) return;
  
  collaborationMgr.updateReviewStatus(reviewId, status, comment);
  closeModal();
  showToast(status === REVIEW_STATUS.APPROVED ? '评审已通过' : '评审已驳回', 'success');
}

// ==================== 活动日志 UI ====================

// 渲染活动日志页面
function renderActivityLog() {
  const currentUser = dataManager.getCurrentUser();
  const activities = collaborationMgr.getActivities({ limit: 50 });
  
  return `
    <div class="page-header">
      <h1><i data-lucide="activity" style="width:24px;height:24px;vertical-align:middle;margin-right:8px"></i>活动日志</h1>
      <div class="subtitle">查看系统中的所有活动记录</div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <h3>最近活动</h3>
        <select class="form-control form-control-sm" id="activity-filter" onchange="filterActivities()">
          <option value="">全部活动</option>
          <option value="code_commit">代码提交</option>
          <option value="code_review">代码评审</option>
          <option value="task_created">任务创建</option>
          <option value="task_completed">任务完成</option>
          <option value="evaluation_submitted">评价提交</option>
        </select>
      </div>
      <div class="card-body" style="padding:0">
        <div class="activity-list">
          ${activities.map(activity => {
            const user = dataManager.getUserById(activity.userId);
            const icon = getActivityIcon(activity.type);
            
            return `
              <div class="activity-item">
                <div class="activity-icon">
                  <i data-lucide="${icon}" style="width:16px;height:16px"></i>
                </div>
                <div class="activity-content">
                  <div class="activity-text">
                    <strong>${user?.name || '未知'}</strong> ${activity.description}
                  </div>
                  <div class="activity-meta">
                    <span>${getTimeAgo(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
          ${activities.length === 0 ? `
            <div class="text-center" style="padding:40px">
              <p class="text-muted">暂无活动记录</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function getActivityIcon(type) {
  const icons = {
    [ACTIVITY_TYPE.CODE_COMMIT]: 'git-commit-horizontal',
    [ACTIVITY_TYPE.CODE_REVIEW]: 'code',
    [ACTIVITY_TYPE.TASK_CREATED]: 'clipboard-plus',
    [ACTIVITY_TYPE.TASK_UPDATED]: 'edit',
    [ACTIVITY_TYPE.TASK_COMPLETED]: 'check-circle',
    [ACTIVITY_TYPE.RECORD_CREATED]: 'file-text',
    [ACTIVITY_TYPE.EVALUATION_SUBMITTED]: 'star',
    [ACTIVITY_TYPE.MATERIAL_UPLOADED]: 'upload',
    [ACTIVITY_TYPE.MEMBER_JOINED]: 'user-plus',
    [ACTIVITY_TYPE.COMMENT_ADDED]: 'message-circle'
  };
  return icons[type] || 'activity';
}

function filterActivities() {
  const filter = document.getElementById('activity-filter')?.value || '';
  const activities = filter 
    ? collaborationMgr.getActivities({ type: filter, limit: 50 })
    : collaborationMgr.getActivities({ limit: 50 });
  
  const listContainer = document.querySelector('.activity-list');
  if (listContainer) {
    listContainer.innerHTML = activities.map(activity => {
      const user = dataManager.getUserById(activity.userId);
      const icon = getActivityIcon(activity.type);
      
      return `
        <div class="activity-item">
          <div class="activity-icon">
            <i data-lucide="${icon}" style="width:16px;height:16px"></i>
          </div>
          <div class="activity-content">
            <div class="activity-text">
              <strong>${user?.name || '未知'}</strong> ${activity.description}
            </div>
            <div class="activity-meta">
              <span>${getTimeAgo(activity.createdAt)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') || '<div class="text-center" style="padding:40px"><p class="text-muted">暂无活动记录</p></div>';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ==================== 待办事项 UI ====================

// 渲染待办事项组件
function renderPendingItems() {
  const currentUser = dataManager.getCurrentUser();
  const pendingItems = collaborationMgr.getPendingItems(currentUser.id);
  
  const totalPending = pendingItems.pendingReviewsReceived.length + pendingItems.pendingReviewsToGive.length;
  
  if (totalPending === 0) return '';
  
  return `
    <div class="card mb-6">
      <div class="card-header">
        <h3><i data-lucide="clock" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i>待办事项</h3>
        <span class="badge badge-warning">${totalPending}</span>
      </div>
      <div class="card-body">
        ${pendingItems.pendingReviewsReceived.length > 0 ? `
          <div class="mb-4">
            <h4 class="mb-2">待处理评审</h4>
            ${pendingItems.pendingReviewsReceived.slice(0, 3).map(review => {
              const reviewer = dataManager.getUserById(review.reviewerId);
              return `
                <div class="pending-item" onclick="showReviewDetail('${review.id}')">
                  <div class="pending-icon"><i data-lucide="code" style="width:16px;height:16px"></i></div>
                  <div class="pending-content">
                    <div>${reviewer?.name || '未知'} 对您的代码提交了评审</div>
                    <div class="text-muted text-sm">${getTimeAgo(review.createdAt)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        ${pendingItems.pendingReviewsToGive.length > 0 ? `
          <div>
            <h4 class="mb-2">待评审代码</h4>
            ${pendingItems.pendingReviewsToGive.slice(0, 3).map(review => {
              const targetUser = dataManager.getUserById(review.targetUserId);
              return `
                <div class="pending-item" onclick="showReviewDetail('${review.id}')">
                  <div class="pending-icon"><i data-lucide="eye" style="width:16px;height:16px"></i></div>
                  <div class="pending-content">
                    <div>${targetUser?.name || '未知'} 的代码等待您的评审</div>
                    <div class="text-muted text-sm">${getTimeAgo(review.createdAt)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
