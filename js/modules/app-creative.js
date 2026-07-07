/**
 * 创意前端模块 - AI对话、拖拽看板、3D数据大屏
 */

// ==================== AI对话助手 ====================
const AiChatCreative = {
    conversations: [],
    currentConversation: null,
    messages: [],
    isStreaming: false,
    
    init() {
        this.loadConversations();
        console.log('[AiChat] AI对话助手已初始化');
    },
    
    async loadConversations() {
        const userId = getCurrentUserId();
        if (!userId) return;
        
        try {
            const response = await apiRequest(`/ai/conversations?userId=${userId}`);
            this.conversations = response.data || [];
        } catch (error) {
            console.error('加载对话列表失败:', error);
        }
    },
    
    renderChatInterface() {
        return `
            <div class="ai-chat-container">
                <div class="ai-sidebar">
                    <div class="ai-sidebar-header">
                        <button class="ai-new-chat-btn" onclick="AiChatCreative.newConversation()">
                            <i data-lucide="plus" style="width:18px;height:18px"></i>
                            新建对话
                        </button>
                    </div>
                    <div class="ai-conversation-list">
                        ${this.renderConversationList()}
                    </div>
                </div>
                
                <div class="ai-main">
                    <div class="ai-chat-header">
                        <div class="ai-model-selector">
                            <span class="ai-model-dot"></span>
                            <span>DeepSeek AI</span>
                        </div>
                    </div>
                    
                    <div class="ai-messages" id="ai-messages">
                        ${this.renderWelcome()}
                    </div>
                    
                    <div class="ai-input-area">
                        <div class="ai-input-wrapper">
                            <textarea class="ai-input" id="ai-input" placeholder="输入你的问题..." rows="1"
                                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();AiChatCreative.sendMessage()}"></textarea>
                            <button class="ai-send-btn" onclick="AiChatCreative.sendMessage()" id="ai-send-btn">
                                <i data-lucide="send" style="width:18px;height:18px"></i>
                            </button>
                        </div>
                        <div class="ai-input-footer">
                            <span class="ai-input-hint">Enter 发送，Shift+Enter 换行</span>
                            <div class="ai-input-actions">
                                <button class="ai-input-action" title="上传文件">
                                    <i data-lucide="paperclip" style="width:16px;height:16px"></i>
                                </button>
                                <button class="ai-input-action" title="代码块">
                                    <i data-lucide="code" style="width:16px;height:16px"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderConversationList() {
        if (this.conversations.length === 0) {
            return '<div style="padding:20px;text-align:center;color:var(--gray-500,#64748b);">暂无对话</div>';
        }
        
        return this.conversations.map(conv => `
            <div class="ai-conversation-item ${conv.id === this.currentConversation?.id ? 'active' : ''}"
                 onclick="AiChatCreative.selectConversation(${conv.id})">
                <div class="ai-conversation-icon">
                    <i data-lucide="message-square" style="width:16px;height:16px"></i>
                </div>
                <span class="ai-conversation-title">${conv.title || '新对话'}</span>
            </div>
        `).join('');
    },
    
    renderWelcome() {
        return `
            <div class="ai-welcome">
                <div class="ai-welcome-icon">
                    <i data-lucide="bot" style="width:40px;height:40px"></i>
                </div>
                <h2>AI智能助手</h2>
                <p>我可以帮助你解答编程问题、解释代码、提供建议。试试下面的问题开始对话。</p>
                <div class="ai-suggestions">
                    <div class="ai-suggestion-card" onclick="AiChatCreative.sendSuggestion('解释一下Java中的多态概念')">
                        <div class="ai-suggestion-title">Java多态</div>
                        <div class="ai-suggestion-desc">解释面向对象的核心概念</div>
                    </div>
                    <div class="ai-suggestion-card" onclick="AiChatCreative.sendSuggestion('如何优化SQL查询性能？')">
                        <div class="ai-suggestion-title">SQL优化</div>
                        <div class="ai-suggestion-desc">数据库性能优化技巧</div>
                    </div>
                    <div class="ai-suggestion-card" onclick="AiChatCreative.sendSuggestion('Spring Boot项目最佳实践')">
                        <div class="ai-suggestion-title">Spring Boot</div>
                        <div class="ai-suggestion-desc">项目开发最佳实践</div>
                    </div>
                    <div class="ai-suggestion-card" onclick="AiChatCreative.sendSuggestion('解释RESTful API设计原则')">
                        <div class="ai-suggestion-title">API设计</div>
                        <div class="ai-suggestion-desc">RESTful架构原则</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    async newConversation() {
        this.currentConversation = null;
        this.messages = [];
        this.renderMessages();
    },
    
    async selectConversation(conversationId) {
        try {
            const response = await apiRequest(`/ai/conversations/${conversationId}/messages?userId=${getCurrentUserId()}`);
            this.messages = response.data || [];
            this.currentConversation = { id: conversationId };
            this.renderMessages();
        } catch (error) {
            console.error('加载对话失败:', error);
        }
    },
    
    renderMessages() {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        
        if (this.messages.length === 0) {
            container.innerHTML = this.renderWelcome();
        } else {
            container.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');
        }
        
        this.scrollToBottom();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },
    
    renderMessage(message) {
        const isUser = message.role === 'user';
        const content = this.formatContent(message.content);
        
        return `
            <div class="ai-message ${isUser ? 'user' : 'assistant'}">
                <div class="ai-message-avatar">
                    <i data-lucide="${isUser ? 'user' : 'bot'}" style="width:18px;height:18px"></i>
                </div>
                <div class="ai-message-content">
                    <div class="ai-message-text">${content}</div>
                </div>
            </div>
        `;
    },
    
    formatContent(content) {
        if (!content) return '';
        
        // 代码块
        content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `
                <div class="ai-code-block">
                    <div class="ai-code-header">
                        <span class="ai-code-lang">${lang || 'code'}</span>
                        <button class="ai-code-copy" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)">复制</button>
                    </div>
                    <div class="ai-code-body">
                        <pre><code>${this.escapeHtml(code.trim())}</code></pre>
                    </div>
                </div>
            `;
        });
        
        // 内联代码
        content = content.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
        
        // 粗体
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 换行
        content = content.replace(/\n/g, '<br>');
        
        return content;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async sendMessage() {
        const input = document.getElementById('ai-input');
        const message = input.value.trim();
        if (!message || this.isStreaming) return;
        
        input.value = '';
        this.messages.push({ role: 'user', content: message });
        this.renderMessages();
        
        await this.streamResponse(message);
    },
    
    async sendSuggestion(suggestion) {
        const input = document.getElementById('ai-input');
        input.value = suggestion;
        await this.sendMessage();
    },
    
    async streamResponse(message) {
        this.isStreaming = true;
        
        const assistantMessage = { role: 'assistant', content: '' };
        this.messages.push(assistantMessage);
        
        const container = document.getElementById('ai-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message assistant';
        messageDiv.innerHTML = `
            <div class="ai-message-avatar">
                <i data-lucide="bot" style="width:18px;height:18px"></i>
            </div>
            <div class="ai-message-content">
                <div class="ai-message-text">
                    <div class="ai-typing-indicator">
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                        <span class="ai-typing-dot"></span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(messageDiv);
        this.scrollToBottom();
        
        try {
            const response = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getAuthToken()
                },
                body: JSON.stringify({ message, language: 'java', topic: message })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') break;
                        fullContent += data;
                        
                        const textDiv = messageDiv.querySelector('.ai-message-text');
                        if (textDiv) {
                            textDiv.innerHTML = this.formatContent(fullContent);
                        }
                        this.scrollToBottom();
                    }
                }
            }
            
            assistantMessage.content = fullContent;
        } catch (error) {
            assistantMessage.content = '抱歉，AI服务暂时不可用。';
        }
        
        this.isStreaming = false;
        this.renderMessages();
    },
    
    scrollToBottom() {
        const container = document.getElementById('ai-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }
};

// ==================== 拖拽看板 ====================
const KanbanBoard = {
    tasks: [],
    dragTask: null,
    
    init() {
        this.loadTasks();
        console.log('[Kanban] 拖拽看板已初始化');
    },
    
    async loadTasks() {
        try {
            const response = await apiRequest('/tasks/user/' + getCurrentUserId());
            this.tasks = response.data?.content || [];
        } catch (error) {
            console.error('加载任务失败:', error);
        }
    },
    
    renderKanban() {
        const statuses = [
            { key: 'PENDING', label: '待处理', icon: 'clock' },
            { key: 'IN_PROGRESS', label: '进行中', icon: 'play' },
            { key: 'SUBMITTED', label: '已提交', icon: 'send' },
            { key: 'COMPLETED', label: '已完成', icon: 'check-circle' }
        ];
        
        return `
            <div class="kanban-container">
                <div class="kanban-header">
                    <div class="kanban-title">
                        <i data-lucide="kanban" style="width:24px;height:24px"></i>
                        任务看板
                    </div>
                    <div class="kanban-actions">
                        <button class="btn btn-primary" onclick="KanbanBoard.showCreateModal()">
                            <i data-lucide="plus" style="width:16px;height:16px"></i>
                            新建任务
                        </button>
                    </div>
                </div>
                
                <div class="kanban-board">
                    ${statuses.map(status => this.renderColumn(status)).join('')}
                </div>
            </div>
        `;
    },
    
    renderColumn(status) {
        const tasks = this.tasks.filter(t => t.status === status.key);
        
        return `
            <div class="kanban-column" data-status="${status.key}">
                <div class="kanban-column-header">
                    <div class="kanban-column-title">
                        <i data-lucide="${status.icon}" style="width:16px;height:16px"></i>
                        ${status.label}
                        <span class="kanban-column-count">${tasks.length}</span>
                    </div>
                    <button class="kanban-column-action">
                        <i data-lucide="more-horizontal" style="width:16px;height:16px"></i>
                    </button>
                </div>
                <div class="kanban-card-list" 
                     ondragover="KanbanBoard.handleDragOver(event)"
                     ondrop="KanbanBoard.handleDrop(event, '${status.key}')">
                    ${tasks.map(task => this.renderCard(task)).join('')}
                    <button class="kanban-add-card" onclick="KanbanBoard.showCreateModal('${status.key}')">
                        <i data-lucide="plus" style="width:16px;height:16px"></i>
                        添加任务
                    </button>
                </div>
            </div>
        `;
    },
    
    renderCard(task) {
        return `
            <div class="kanban-card" 
                 draggable="true"
                 data-task-id="${task.id}"
                 ondragstart="KanbanBoard.handleDragStart(event, ${task.id})"
                 ondragend="KanbanBoard.handleDragEnd(event)"
                 onclick="KanbanBoard.showTaskDetail(${task.id})">
                <div class="kanban-card-priority ${task.priority || 'medium'}"></div>
                <div class="kanban-card-title">${task.title}</div>
                ${task.description ? `<div class="kanban-card-desc">${task.description}</div>` : ''}
                <div class="kanban-card-footer">
                    <div class="kanban-card-meta">
                        ${task.priority === 'high' ? '<span class="kanban-card-tag urgent">紧急</span>' : ''}
                        ${task.dueDate ? `<span class="kanban-card-due"><i data-lucide="calendar" style="width:12px;height:12px"></i> ${task.dueDate}</span>` : ''}
                    </div>
                    ${task.assignedTo ? `<div class="kanban-card-assignee">${task.assignedTo.name?.charAt(0) || 'U'}</div>` : ''}
                </div>
            </div>
        `;
    },
    
    handleDragStart(event, taskId) {
        this.dragTask = taskId;
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
    },
    
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        document.querySelectorAll('.kanban-card-list').forEach(el => {
            el.classList.remove('drag-over');
        });
    },
    
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-over');
    },
    
    async handleDrop(event, newStatus) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        if (!this.dragTask) return;
        
        try {
            await apiRequest(`/tasks/${this.dragTask}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            // 更新本地数据
            const task = this.tasks.find(t => t.id === this.dragTask);
            if (task) task.status = newStatus;
            
            this.renderKanban();
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            showToastNotification({
                type: 'success',
                title: '任务状态已更新',
                message: `任务已移动到${this.getStatusLabel(newStatus)}`
            });
        } catch (error) {
            console.error('更新任务状态失败:', error);
        }
        
        this.dragTask = null;
    },
    
    getStatusLabel(status) {
        const labels = {
            'PENDING': '待处理',
            'IN_PROGRESS': '进行中',
            'SUBMITTED': '已提交',
            'COMPLETED': '已完成'
        };
        return labels[status] || status;
    },
    
    showCreateModal(status = 'PENDING') {
        // 实现创建任务弹窗
        console.log('创建任务，状态:', status);
    },
    
    showTaskDetail(taskId) {
        // 实现任务详情弹窗
        console.log('查看任务详情:', taskId);
    }
};

// ==================== 3D数据大屏 ====================
const DataScreen3D = {
    canvas: null,
    ctx: null,
    particles: [],
    
    init() {
        console.log('[DataScreen] 3D数据大屏已初始化');
    },
    
    renderScreen() {
        return `
            <div class="data-screen-container">
                <div class="particle-background" id="particle-bg">
                    <canvas id="particle-canvas-3d"></canvas>
                </div>
                <div class="grid-background"></div>
                <div class="glow-effect primary"></div>
                <div class="glow-effect secondary"></div>
                <div class="scan-line"></div>
                
                <div class="screen-header">
                    <div class="screen-title">
                        <h1>实训数据大屏</h1>
                        <span class="screen-title-dot"></span>
                    </div>
                    <div class="screen-time" id="screen-time"></div>
                </div>
                
                <div class="screen-stats">
                    ${this.renderStats()}
                </div>
                
                <div class="screen-charts">
                    <div class="screen-chart-card">
                        <div class="screen-chart-header">
                            <div class="screen-chart-title">
                                <i data-lucide="bar-chart" style="width:20px;height:20px"></i>
                                任务完成趋势
                            </div>
                        </div>
                        <div class="screen-chart-body" id="trend-chart"></div>
                    </div>
                    <div class="screen-chart-card">
                        <div class="screen-chart-header">
                            <div class="screen-chart-title">
                                <i data-lucide="globe" style="width:20px;height:20px"></i>
                                实时状态
                            </div>
                        </div>
                        <div class="screen-chart-body">
                            <div class="globe-container">
                                <div class="globe">
                                    <div class="globe-ring"></div>
                                    <div class="globe-ring"></div>
                                    <div class="globe-ring"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="screen-bottom">
                    ${this.renderBottomCards()}
                </div>
            </div>
        `;
    },
    
    renderStats() {
        const stats = [
            { icon: 'clipboard-list', value: '128', label: '任务总数', trend: '+12%', trendType: 'up' },
            { icon: 'check-circle', value: '85%', label: '完成率', trend: '+5%', trendType: 'up' },
            { icon: 'users', value: '56', label: '活跃用户', trend: '+8%', trendType: 'up' },
            { icon: 'clock', value: '2.5h', label: '平均用时', trend: '-15%', trendType: 'down' }
        ];
        
        return stats.map(stat => `
            <div class="screen-stat-card">
                <div class="screen-stat-icon">
                    <i data-lucide="${stat.icon}" style="width:24px;height:24px"></i>
                </div>
                <div class="screen-stat-value">${stat.value}</div>
                <div class="screen-stat-label">${stat.label}</div>
                <div class="screen-stat-trend ${stat.trendType}">
                    <i data-lucide="trending-${stat.trendType}" style="width:14px;height:14px"></i>
                    ${stat.trend}
                </div>
            </div>
        `).join('');
    },
    
    renderBottomCards() {
        return `
            <div class="screen-bottom-card">
                <div class="screen-bottom-header">
                    <div class="screen-bottom-title">
                        <i data-lucide="activity" style="width:18px;height:18px"></i>
                        最近活动
                    </div>
                </div>
                <div class="data-list">
                    ${this.renderActivityList()}
                </div>
            </div>
            <div class="screen-bottom-card">
                <div class="screen-bottom-header">
                    <div class="screen-bottom-title">
                        <i data-lucide="target" style="width:18px;height:18px"></i>
                        项目进度
                    </div>
                </div>
                <div class="data-list">
                    ${this.renderProjectList()}
                </div>
            </div>
            <div class="screen-bottom-card">
                <div class="screen-bottom-header">
                    <div class="screen-bottom-title">
                        <i data-lucide="award" style="width:18px;height:18px"></i>
                        排行榜
                    </div>
                </div>
                <div class="data-list">
                    ${this.renderLeaderboard()}
                </div>
            </div>
        `;
    },
    
    renderActivityList() {
        const activities = [
            { icon: 'check-circle', name: '完成任务', desc: '张三完成了Java实训', time: '2分钟前' },
            { icon: 'message-circle', name: '新增评论', desc: '李四评论了代码', time: '5分钟前' },
            { icon: 'upload', name: '上传文件', desc: '王五上传了文档', time: '10分钟前' }
        ];
        
        return activities.map(item => `
            <div class="data-list-item">
                <div class="data-list-left">
                    <div class="data-list-icon">
                        <i data-lucide="${item.icon}" style="width:16px;height:16px"></i>
                    </div>
                    <div class="data-list-info">
                        <span class="data-list-name">${item.name}</span>
                        <span class="data-list-desc">${item.desc}</span>
                    </div>
                </div>
                <span class="data-list-desc">${item.time}</span>
            </div>
        `).join('');
    },
    
    renderProjectList() {
        const projects = [
            { name: 'Java实训', progress: 75 },
            { name: 'Web开发', progress: 60 },
            { name: '数据库设计', progress: 90 }
        ];
        
        return projects.map(project => `
            <div class="data-list-item">
                <div class="data-list-info" style="width:100%">
                    <span class="data-list-name">${project.name}</span>
                    <div class="screen-progress">
                        <div class="screen-progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                </div>
                <span class="data-list-value">${project.progress}%</span>
            </div>
        `).join('');
    },
    
    renderLeaderboard() {
        const users = [
            { rank: 1, name: '张三', score: 95 },
            { rank: 2, name: '李四', score: 92 },
            { rank: 3, name: '王五', score: 88 }
        ];
        
        return users.map(user => `
            <div class="data-list-item">
                <div class="data-list-left">
                    <div class="data-list-icon" style="background: ${user.rank <= 3 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.1)'}; color: ${user.rank <= 3 ? '#f59e0b' : '#818cf8'}">
                       	#{user.rank}
                    </div>
                    <span class="data-list-name">${user.name}</span>
                </div>
                <span class="data-list-value">${user.score}分</span>
            </div>
        `).join('');
    },
    
    initParticles() {
        const canvas = document.getElementById('particle-canvas-3d');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        }
        
        animate();
    },
    
    updateClock() {
        const timeEl = document.getElementById('screen-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }
};

// 导出模块
window.AiChatCreative = AiChatCreative;
window.KanbanBoard = KanbanBoard;
window.DataScreen3D = DataScreen3D;
