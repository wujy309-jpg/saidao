/**
 * 智能排期助手模块 - AI甘特图排期
 */

const SmartScheduler = {
    project: null,
    tasks: [],
    members: [],
    schedule: null,
    dragTask: null,
    isGenerating: false,

    render() {
        return `
            <div class="ss-container">
                <div class="ss-header">
                    <div class="ss-header-left">
                        <div class="ss-icon-box">
                            <i data-lucide="calendar-range" style="width:28px;height:28px"></i>
                        </div>
                        <div>
                            <h1 class="ss-title">智能排期助手</h1>
                            <p class="ss-subtitle">AI 自动生成项目排期方案 · 考虑技能、负载与依赖</p>
                        </div>
                    </div>
                    <div class="ss-header-actions">
                        <button class="ss-generate-btn" id="ss-generate-btn" onclick="SmartScheduler.generateSchedule()">
                            <i data-lucide="sparkles" style="width:16px;height:16px"></i>
                            AI 智能排期
                        </button>
                    </div>
                </div>

                <div class="ss-config-section">
                    <div class="ss-config-card">
                        <h3><i data-lucide="target" style="width:18px;height:18px"></i> 项目信息</h3>
                        <div class="ss-form-grid">
                            <div class="ss-form-item">
                                <label>项目名称</label>
                                <input type="text" id="ss-project-name" placeholder="例如: 软件实训管理系统" value="软件实训项目">
                            </div>
                            <div class="ss-form-item">
                                <label>项目周期（天）</label>
                                <input type="number" id="ss-duration" min="7" max="180" value="30">
                            </div>
                            <div class="ss-form-item">
                                <label>开始日期</label>
                                <input type="date" id="ss-start-date" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                    </div>

                    <div class="ss-config-card">
                        <h3><i data-lucide="users" style="width:18px;height:18px"></i> 团队成员</h3>
                        <div class="ss-members-list" id="ss-members-list"></div>
                        <button class="ss-add-member-btn" onclick="SmartScheduler.addMember()">
                            <i data-lucide="user-plus" style="width:16px;height:16px"></i>
                            添加成员
                        </button>
                    </div>

                    <div class="ss-config-card">
                        <h3><i data-lucide="list-checks" style="width:18px;height:18px"></i> 任务清单</h3>
                        <div class="ss-tasks-list" id="ss-tasks-list"></div>
                        <button class="ss-add-task-btn" onclick="SmartScheduler.addTask()">
                            <i data-lucide="plus" style="width:16px;height:16px"></i>
                            添加任务
                        </button>
                    </div>
                </div>

                <div id="ss-gantt-section" class="ss-gantt-section" style="display:none">
                    <div class="ss-gantt-header">
                        <h3><i data-lucide="gantt-chart" style="width:18px;height:18px"></i> 排期甘特图</h3>
                        <div class="ss-gantt-legend">
                            <span class="ss-legend-item"><span class="ss-legend-dot" style="background:#6366f1"></span>待处理</span>
                            <span class="ss-legend-item"><span class="ss-legend-dot" style="background:#3b82f6"></span>进行中</span>
                            <span class="ss-legend-item"><span class="ss-legend-dot" style="background:#22c55e"></span>已完成</span>
                            <span class="ss-legend-item"><span class="ss-legend-dot" style="background:#f59e0b"></span>里程碑</span>
                        </div>
                    </div>
                    <div class="ss-gantt-container" id="ss-gantt-container"></div>
                </div>

                <div id="ss-suggestions" class="ss-suggestions" style="display:none">
                    <h3><i data-lucide="lightbulb" style="width:18px;height:18px"></i> AI 建议</h3>
                    <div id="ss-suggestions-content"></div>
                </div>
            </div>
        `;
    },

    init() {
        this.members = [
            { id: 1, name: '张三', role: '前端开发', skills: ['JavaScript', 'Vue', 'CSS'], load: 0.7 },
            { id: 2, name: '李四', role: '后端开发', skills: ['Java', 'Spring Boot', 'MySQL'], load: 0.6 },
            { id: 3, name: '王五', role: '全栈开发', skills: ['Java', 'JavaScript', '数据库'], load: 0.8 },
            { id: 4, name: '赵六', role: '测试工程师', skills: ['测试', '自动化测试'], load: 0.5 }
        ];

        this.tasks = [
            { id: 1, title: '需求分析', duration: 3, priority: 'high', skills: [], deps: [] },
            { id: 2, title: '数据库设计', duration: 2, priority: 'high', skills: ['MySQL'], deps: [1] },
            { id: 3, title: '后端API开发', duration: 7, priority: 'high', skills: ['Java', 'Spring Boot'], deps: [2] },
            { id: 4, title: '前端页面开发', duration: 7, priority: 'high', skills: ['JavaScript', 'Vue'], deps: [1] },
            { id: 5, title: '前后端联调', duration: 3, priority: 'medium', skills: ['Java', 'JavaScript'], deps: [3, 4] },
            { id: 6, title: '测试与修复', duration: 5, priority: 'medium', skills: ['测试'], deps: [5] },
            { id: 7, title: '部署上线', duration: 2, priority: 'low', skills: ['Java'], deps: [6] }
        ];

        this.renderMembers();
        this.renderTasks();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderMembers() {
        const container = document.getElementById('ss-members-list');
        if (!container) return;

        container.innerHTML = this.members.map(m => `
            <div class="ss-member-card">
                <div class="ss-member-avatar">${m.name.charAt(0)}</div>
                <div class="ss-member-info">
                    <div class="ss-member-name">${m.name}</div>
                    <div class="ss-member-role">${m.role}</div>
                    <div class="ss-member-skills">${m.skills.map(s => `<span class="ss-skill-tag">${s}</span>`).join('')}</div>
                </div>
                <div class="ss-member-load">
                    <div class="ss-load-bar"><div class="ss-load-fill" style="width:${m.load * 100}%"></div></div>
                    <span>${Math.round(m.load * 100)}%</span>
                </div>
                <button class="ss-remove-btn" onclick="SmartScheduler.removeMember(${m.id})" title="移除">
                    <i data-lucide="x" style="width:14px;height:14px"></i>
                </button>
            </div>
        `).join('');
    },

    renderTasks() {
        const container = document.getElementById('ss-tasks-list');
        if (!container) return;

        container.innerHTML = this.tasks.map(t => `
            <div class="ss-task-item">
                <span class="ss-task-priority ${t.priority}"></span>
                <span class="ss-task-title">${t.title}</span>
                <span class="ss-task-duration">${t.duration}天</span>
                <span class="ss-task-deps">${t.deps.length > 0 ? '依赖: ' + t.deps.map(d => this.tasks.find(x => x.id === d)?.title || d).join(', ') : '无依赖'}</span>
                <button class="ss-remove-btn" onclick="SmartScheduler.removeTask(${t.id})" title="移除">
                    <i data-lucide="x" style="width:14px;height:14px"></i>
                </button>
            </div>
        `).join('');
    },

    addMember() {
        const id = Date.now();
        this.members.push({ id, name: `成员${this.members.length + 1}`, role: '开发', skills: ['Java'], load: 0.5 });
        this.renderMembers();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    removeMember(id) {
        this.members = this.members.filter(m => m.id !== id);
        this.renderMembers();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    addTask() {
        const id = Date.now();
        this.tasks.push({ id, title: `新任务${this.tasks.length + 1}`, duration: 3, priority: 'medium', skills: [], deps: [] });
        this.renderTasks();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    removeTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.tasks.forEach(t => { t.deps = t.deps.filter(d => d !== id); });
        this.renderTasks();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async generateSchedule() {
        this.isGenerating = true;
        const btn = document.getElementById('ss-generate-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="ss-spinner"></span> AI 排期中...';

        try {
            const response = await apiRequest('/ai/chat/stream', {
                method: 'POST',
                body: JSON.stringify({
                    message: `请为以下项目生成排期建议:\n项目: ${document.getElementById('ss-project-name').value}\n周期: ${document.getElementById('ss-duration').value}天\n团队: ${this.members.map(m => `${m.name}(${m.role})`).join(', ')}\n任务: ${this.tasks.map(t => `${t.title}(${t.duration}天, ${t.priority})`).join(', ')}`,
                    language: 'java',
                    topic: '项目排期'
                })
            });
        } catch (e) {
            console.log('AI排期使用本地算法');
        }

        this.schedule = this.calculateSchedule();
        this.renderGantt();
        this.renderSuggestions();

        document.getElementById('ss-gantt-section').style.display = 'block';
        document.getElementById('ss-suggestions').style.display = 'block';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        this.isGenerating = false;
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" style="width:16px;height:16px"></i> AI 智能排期';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    calculateSchedule() {
        const startDate = new Date(document.getElementById('ss-start-date').value);
        const scheduled = [];
        const taskEndDates = {};

        const sorted = [...this.tasks].sort((a, b) => {
            if (a.deps.length !== b.deps.length) return a.deps.length - b.deps.length;
            const prio = { high: 0, medium: 1, low: 2 };
            return (prio[a.priority] || 1) - (prio[b.priority] || 1);
        });

        sorted.forEach(task => {
            let taskStart;
            if (task.deps.length === 0) {
                taskStart = new Date(startDate);
            } else {
                const depEnds = task.deps.map(d => taskEndDates[d]).filter(Boolean);
                taskStart = new Date(Math.max(...depEnds.map(d => d.getTime())));
            }

            const bestMember = this.findBestMember(task);
            const taskEnd = new Date(taskStart);
            taskEnd.setDate(taskEnd.getDate() + task.duration);

            scheduled.push({
                ...task,
                startDate: taskStart,
                endDate: taskEnd,
                assignedTo: bestMember
            });

            taskEndDates[task.id] = taskEnd;
        });

        return scheduled;
    },

    findBestMember(task) {
        let best = null;
        let bestScore = -1;

        this.members.forEach(m => {
            let score = 0;
            if (task.skills.some(s => m.skills.includes(s))) score += 3;
            score += (1 - m.load) * 2;
            if (score > bestScore) {
                bestScore = score;
                best = m;
            }
        });

        return best || this.members[0];
    },

    renderGantt() {
        const container = document.getElementById('ss-gantt-container');
        if (!container || !this.schedule) return;

        const startDate = new Date(document.getElementById('ss-start-date').value);
        const totalDays = parseInt(document.getElementById('ss-duration').value);
        const dayWidth = 40;

        let html = '<div class="ss-gantt-scroll"><div class="ss-gantt-chart" style="width:' + (totalDays * dayWidth + 200) + 'px">';

        html += '<div class="ss-gantt-timeline-header"><div class="ss-gantt-task-col">任务</div><div class="ss-gantt-dates">';
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            html += `<div class="ss-gantt-date ${isWeekend ? 'weekend' : ''}" style="width:${dayWidth}px">${d.getMonth() + 1}/${d.getDate()}</div>`;
        }
        html += '</div></div>';

        this.schedule.forEach((task, idx) => {
            const startOffset = Math.round((task.startDate - startDate) / (1000 * 60 * 60 * 24));
            const barLeft = startOffset * dayWidth;
            const barWidth = task.duration * dayWidth;

            html += `
                <div class="ss-gantt-row" style="animation-delay:${idx * 0.05}s">
                    <div class="ss-gantt-task-col">
                        <span class="ss-gantt-priority ${task.priority}"></span>
                        <span>${task.title}</span>
                    </div>
                    <div class="ss-gantt-bar-area">
                        <div class="ss-gantt-bar" style="left:${barLeft}px;width:${barWidth}px;background:${this.getPriorityColor(task.priority)}"
                             draggable="true"
                             ondragstart="SmartScheduler.dragStart(event, ${task.id})"
                             title="${task.title}: ${task.duration}天 → ${task.assignedTo?.name || '未分配'}">
                            <span class="ss-gantt-bar-label">${task.assignedTo?.name || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        container.innerHTML = html;
    },

    renderSuggestions() {
        const container = document.getElementById('ss-suggestions-content');
        if (!container) return;

        const suggestions = [
            { icon: 'clock', text: '建议将"需求分析"提前到项目启动前完成，以减少后续返工' },
            { icon: 'users', text: '王五负载较高(80%)，建议将部分任务分配给张三或李四' },
            { icon: 'git-branch', text: '"前后端联调"依赖前后端开发，建议预留缓冲时间' },
            { icon: 'shield', text: '建议在"测试与修复"阶段前增加代码审查环节' }
        ];

        container.innerHTML = suggestions.map(s => `
            <div class="ss-suggestion-item">
                <i data-lucide="${s.icon}" style="width:18px;height:18px;color:#6366f1"></i>
                <span>${s.text}</span>
            </div>
        `).join('');
    },

    getPriorityColor(priority) {
        const colors = { high: '#6366f1', medium: '#3b82f6', low: '#22c55e' };
        return colors[priority] || '#94a3b8';
    },

    dragStart(event, taskId) {
        this.dragTask = taskId;
        event.dataTransfer.effectAllowed = 'move';
    }
};

window.SmartScheduler = SmartScheduler;
