/**
 * 协作功能模块 - 评论、@提及、看板拖拽
 */

const CollaborationModule = {
    currentTaskId: null,
    comments: [],
    activities: [],
    mentionedUsers: [],
    
    init() {
        this.initMentionAutocomplete();
        this.initKanbanDragDrop();
        console.log('[Collaboration] 协作模块已初始化');
    },
    
    initMentionAutocomplete() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('comment-input')) {
                this.handleMentionInput(e.target);
            }
        });
    },
    
    async handleMentionInput(input) {
        const value = input.value;
        const cursorPos = input.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (mentionMatch) {
            const query = mentionMatch[1];
            if (query.length >= 1) {
                await this.searchUsers(query, input);
            } else {
                this.hideMentionDropdown();
            }
        } else {
            this.hideMentionDropdown();
        }
    },
    
    async searchUsers(query, input) {
        try {
            const response = await apiRequest(`/users/search?q=${query}`);
            const users = response.data || [];
            this.showMentionDropdown(users, input);
        } catch (error) {
            console.error('搜索用户失败:', error);
        }
    },
    
    showMentionDropdown(users, input) {
        let dropdown = document.getElementById('mention-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'mention-dropdown';
            dropdown.className = 'mention-dropdown';
            document.body.appendChild(dropdown);
        }
        
        if (users.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        dropdown.innerHTML = users.map(user => `
            <div class="mention-item" data-username="${user.username}" onclick="CollaborationModule.selectMention('${user.username}', '${user.name}')">
                <span class="mention-avatar">${user.name.charAt(0)}</span>
                <span class="mention-name">${user.name}</span>
                <span class="mention-username">@${user.username}</span>
            </div>
        `).join('');
        
        const rect = input.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 5) + 'px';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.display = 'block';
    },
    
    hideMentionDropdown() {
        const dropdown = document.getElementById('mention-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    },
    
    selectMention(username, name) {
        const input = document.querySelector('.comment-input:focus');
        if (input) {
            const value = input.value;
            const cursorPos = input.selectionStart;
            const textBeforeCursor = value.substring(0, cursorPos);
            const textAfterCursor = value.substring(cursorPos);
            
            const newText = textBeforeCursor.replace(/@\w*$/, `@${username} `) + textAfterCursor;
            input.value = newText;
            input.focus();
        }
        this.hideMentionDropdown();
    },
    
    async loadComments(taskId) {
        this.currentTaskId = taskId;
        
        try {
            const response = await apiRequest(`/collaboration/comments/task/${taskId}`);
            this.comments = response.data || [];
            this.renderComments();
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    },
    
    renderComments() {
        const container = document.getElementById('task-comments-list');
        if (!container) return;
        
        if (this.comments.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无评论</div>';
            return;
        }
        
        container.innerHTML = this.comments.map(comment => this.renderCommentItem(comment)).join('');
    },
    
    renderCommentItem(comment) {
        const mentionedHtml = this.renderMentions(comment.content);
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-user-info">
                        <span class="comment-avatar">${this.getUserAvatar(comment.userId)}</span>
                        <span class="comment-user-name">${this.getUserName(comment.userId)}</span>
                        <span class="comment-time">${formatDate(comment.createdAt)}</span>
                        ${comment.isEdited ? '<span class="comment-edited">(已编辑)</span>' : ''}
                    </div>
                    <div class="comment-actions">
                        <button class="btn btn-sm" onclick="CollaborationModule.replyToComment(${comment.id})">
                            <i data-lucide="reply"></i> 回复
                        </button>
                        ${comment.userId === getCurrentUserId() ? `
                            <button class="btn btn-sm" onclick="CollaborationModule.editComment(${comment.id})">
                                <i data-lucide="edit"></i> 编辑
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="CollaborationModule.deleteComment(${comment.id})">
                                <i data-lucide="trash"></i> 删除
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="comment-content">${mentionedHtml}</div>
                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${comment.replies.map(reply => this.renderCommentItem(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    renderMentions(content) {
        return content.replace(/@(\w+)/g, '<span class="mention-tag">@$1</span>');
    },
    
    async addComment(taskId, content, parentId = null) {
        try {
            const response = await apiRequest('/collaboration/comments', {
                method: 'POST',
                body: JSON.stringify({
                    taskId,
                    userId: getCurrentUserId(),
                    content,
                    parentId
                })
            });
            
            if (response.success) {
                showToastNotification({
                    type: 'success',
                    title: '评论成功',
                    message: '评论已添加'
                });
                
                await this.loadComments(taskId);
                this.clearCommentInput();
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '评论失败',
                message: error.message
            });
        }
    },
    
    replyToComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const input = document.getElementById('comment-input');
            if (input) {
                input.value = `@${this.getUserName(comment.userId)} `;
                input.focus();
                input.dataset.parentId = commentId;
            }
        }
    },
    
    async editComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const newContent = prompt('编辑评论:', comment.content);
            if (newContent && newContent !== comment.content) {
                try {
                    const response = await apiRequest(`/collaboration/comments/${commentId}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            userId: getCurrentUserId(),
                            content: newContent
                        })
                    });
                    
                    if (response.success) {
                        await this.loadComments(this.currentTaskId);
                    }
                } catch (error) {
                    showToastNotification({
                        type: 'error',
                        title: '编辑失败',
                        message: error.message
                    });
                }
            }
        }
    },
    
    async deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) {
            return;
        }
        
        try {
            const response = await apiRequest(`/collaboration/comments/${commentId}?userId=${getCurrentUserId()}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                showToastNotification({
                    type: 'success',
                    title: '删除成功',
                    message: '评论已删除'
                });
                
                await this.loadComments(this.currentTaskId);
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '删除失败',
                message: error.message
            });
        }
    },
    
    clearCommentInput() {
        const input = document.getElementById('comment-input');
        if (input) {
            input.value = '';
            input.dataset.parentId = '';
        }
    },
    
    async loadActivities(taskId) {
        try {
            const response = await apiRequest(`/collaboration/activities/task/${taskId}`);
            this.activities = response.data || [];
            this.renderActivities();
        } catch (error) {
            console.error('加载活动记录失败:', error);
        }
    },
    
    renderActivities() {
        const container = document.getElementById('task-activities-list');
        if (!container) return;
        
        if (this.activities.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无活动记录</div>';
            return;
        }
        
        container.innerHTML = this.activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i data-lucide="${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <span class="activity-user">${this.getUserName(activity.userId)}</span>
                    <span class="activity-description">${activity.description}</span>
                    <span class="activity-time">${formatDate(activity.createdAt)}</span>
                </div>
            </div>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    getActivityIcon(type) {
        const icons = {
            'CREATED': 'plus-circle',
            'STATUS_CHANGED': 'refresh-cw',
            'ASSIGNED': 'user-plus',
            'COMMENT_ADDED': 'message-circle',
            'FILE_UPLOADED': 'upload',
            'MENTION': 'at-sign',
            'PRIORITY_CHANGED': 'flag',
            'DUE_DATE_CHANGED': 'calendar',
            'COMPLETED': 'check-circle'
        };
        return icons[type] || 'activity';
    },
    
    initKanbanDragDrop() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupKanbanBoards();
        });
    },
    
    setupKanbanBoards() {
        const kanbanBoards = document.querySelectorAll('.kanban-board');
        kanbanBoards.forEach(board => this.setupKanbanBoard(board));
    },
    
    setupKanbanBoard(board) {
        const columns = board.querySelectorAll('.kanban-column');
        
        columns.forEach(column => {
            const taskList = column.querySelector('.kanban-task-list');
            
            taskList.addEventListener('dragover', (e) => {
                e.preventDefault();
                taskList.classList.add('drag-over');
            });
            
            taskList.addEventListener('dragleave', () => {
                taskList.classList.remove('drag-over');
            });
            
            taskList.addEventListener('drop', (e) => {
                e.preventDefault();
                taskList.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = column.dataset.status;
                
                this.updateTaskStatus(taskId, newStatus);
            });
        });
        
        const tasks = board.querySelectorAll('.kanban-task');
        tasks.forEach(task => {
            task.draggable = true;
            
            task.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.dataset.taskId);
                task.classList.add('dragging');
            });
            
            task.addEventListener('dragend', () => {
                task.classList.remove('dragging');
            });
        });
    },
    
    async updateTaskStatus(taskId, newStatus) {
        try {
            const response = await apiRequest(`/tasks/${taskId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.success) {
                showToastNotification({
                    type: 'success',
                    title: '状态更新成功',
                    message: `任务状态已更新为 ${this.getStatusLabel(newStatus)}`
                });
                
                if (typeof refreshKanban === 'function') {
                    refreshKanban();
                }
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '状态更新失败',
                message: error.message
            });
        }
    },
    
    getStatusLabel(status) {
        const labels = {
            'PENDING': '待开始',
            'IN_PROGRESS': '进行中',
            'SUBMITTED': '已提交',
            'REVIEWING': '审核中',
            'APPROVED': '已通过',
            'REJECTED': '已驳回',
            'COMPLETED': '已完成'
        };
        return labels[status] || status;
    },
    
    getUserAvatar(userId) {
        return 'U';
    },
    
    getUserName(userId) {
        return '用户' + userId;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    CollaborationModule.init();
});
