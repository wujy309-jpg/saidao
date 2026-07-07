/**
 * 实训时间线 / 里程碑墙模块
 * GitHub Contributions Heatmap + 瀑布流时间线
 */

const TrainingTimeline = {
    activities: [],
    milestones: [],

    render() {
        const currentUser = getCurrentUser();
        return `
            <div class="tl-container">
                <div class="tl-header">
                    <div class="tl-header-left">
                        <div class="tl-icon-box">
                            <i data-lucide="clock" style="width:28px;height:28px"></i>
                        </div>
                        <div>
                            <h1 class="tl-title">实训时间线</h1>
                            <p class="tl-subtitle">记录每一步成长，见证里程碑时刻</p>
                        </div>
                    </div>
                    <div class="tl-header-actions">
                        <button class="tl-filter-btn active" onclick="TrainingTimeline.filterBy('all')">全部</button>
                        <button class="tl-filter-btn" onclick="TrainingTimeline.filterBy('task')">任务</button>
                        <button class="tl-filter-btn" onclick="TrainingTimeline.filterBy('review')">评价</button>
                        <button class="tl-filter-btn" onclick="TrainingTimeline.filterBy('milestone')">里程碑</button>
                    </div>
                </div>

                <div class="tl-heatmap-section">
                    <h3 class="tl-section-title"><i data-lucide="calendar-days" style="width:18px;height:18px"></i> 活跃度热力图</h3>
                    <div class="tl-heatmap" id="tl-heatmap"></div>
                    <div class="tl-heatmap-legend">
                        <span class="tl-legend-label">少</span>
                        <div class="tl-legend-cells">
                            <div class="tl-legend-cell" style="opacity:0.2"></div>
                            <div class="tl-legend-cell" style="opacity:0.4"></div>
                            <div class="tl-legend-cell" style="opacity:0.6"></div>
                            <div class="tl-legend-cell" style="opacity:0.8"></div>
                            <div class="tl-legend-cell" style="opacity:1"></div>
                        </div>
                        <span class="tl-legend-label">多</span>
                    </div>
                </div>

                <div class="tl-stats-row">
                    <div class="tl-stat-card">
                        <div class="tl-stat-icon"><i data-lucide="flame" style="width:24px;height:24px"></i></div>
                        <div class="tl-stat-value" id="tl-streak">0</div>
                        <div class="tl-stat-label">连续活跃天数</div>
                    </div>
                    <div class="tl-stat-card">
                        <div class="tl-stat-icon"><i data-lucide="check-circle-2" style="width:24px;height:24px"></i></div>
                        <div class="tl-stat-value" id="tl-total-activities">0</div>
                        <div class="tl-stat-label">总活动数</div>
                    </div>
                    <div class="tl-stat-card">
                        <div class="tl-stat-icon"><i data-lucide="trophy" style="width:24px;height:24px"></i></div>
                        <div class="tl-stat-value" id="tl-milestones-count">0</div>
                        <div class="tl-stat-label">里程碑达成</div>
                    </div>
                </div>

                <div class="tl-milestones-section">
                    <h3 class="tl-section-title"><i data-lucide="flag" style="width:18px;height:18px"></i> 里程碑墙</h3>
                    <div class="tl-milestones-grid" id="tl-milestones-grid"></div>
                </div>

                <div class="tl-timeline-section">
                    <h3 class="tl-section-title"><i data-lucide="git-commit-horizontal" style="width:18px;height:18px"></i> 活动时间线</h3>
                    <div class="tl-timeline" id="tl-timeline-list"></div>
                </div>
            </div>
        `;
    },

    init() {
        this.loadData();
        this.renderHeatmap();
        this.renderMilestones();
        this.renderTimeline();
        this.updateStats();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    loadData() {
        const currentUser = getCurrentUser();
        const userId = currentUser?.id;
        const tasks = typeof dataManager !== 'undefined' ? dataManager.getTasks({}) : [];
        const records = typeof dataManager !== 'undefined' ? dataManager.getRecords({ userId }) : [];
        const evaluations = typeof dataManager !== 'undefined' ? dataManager.getEvaluations({ evaluateeId: userId }) : [];

        this.activities = [];

        (tasks || []).forEach(t => {
            this.activities.push({
                type: 'task', date: t.completedAt || t.createdAt || new Date().toISOString(),
                title: t.title || '任务', desc: t.status === 'COMPLETED' ? '已完成' : '进行中',
                icon: t.status === 'COMPLETED' ? 'check-circle' : 'clipboard-list',
                status: t.status
            });
        });

        (records || []).forEach(r => {
            this.activities.push({
                type: 'review', date: r.createdAt || new Date().toISOString(),
                title: r.title || '过程记录', desc: r.content?.substring(0, 50) || '',
                icon: 'file-text', status: 'RECORDED'
            });
        });

        (evaluations || []).forEach(e => {
            this.activities.push({
                type: 'review', date: e.createdAt || new Date().toISOString(),
                title: '收到评价', desc: `评分: ${e.score || '-'}`,
                icon: 'star', status: 'EVALUATED'
            });
        });

        this.activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.milestones = [
            { title: '初出茅庐', desc: '完成第一个任务', icon: 'rocket', achieved: tasks.some(t => t.status === 'COMPLETED'), color: '#6366f1' },
            { title: '持之以恒', desc: '连续7天活跃', icon: 'flame', achieved: this.calculateStreak() >= 7, color: '#f59e0b' },
            { title: '代码达人', desc: '提交5次代码', icon: 'code-2', achieved: tasks.filter(t => t.status === 'COMPLETED').length >= 5, color: '#22c55e' },
            { title: '评价之星', desc: '获得3次优秀评价', icon: 'star', achieved: evaluations.filter(e => e.score >= 90).length >= 3, color: '#ec4899' },
            { title: '团队协作者', desc: '参与3个项目', icon: 'users', achieved: true, color: '#06b6d4' },
            { title: '文档专家', desc: '提交10份材料', icon: 'file-check', achieved: (records || []).length >= 10, color: '#8b5cf6' }
        ];
    },

    renderHeatmap() {
        const container = document.getElementById('tl-heatmap');
        if (!container) return;

        const today = new Date();
        const weeks = 20;
        const activityMap = {};

        this.activities.forEach(a => {
            const d = new Date(a.date).toISOString().split('T')[0];
            activityMap[d] = (activityMap[d] || 0) + 1;
        });

        let html = '<div class="tl-heatmap-grid">';
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (weeks * 7));

        for (let w = 0; w < weeks; w++) {
            html += '<div class="tl-heatmap-week">';
            for (let d = 0; d < 7; d++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + (w * 7) + d);
                const dateStr = date.toISOString().split('T')[0];
                const count = activityMap[dateStr] || 0;
                const opacity = count === 0 ? 0.08 : Math.min(1, 0.2 + count * 0.2);
                const isToday = dateStr === today.toISOString().split('T')[0];
                html += `<div class="tl-heatmap-cell ${isToday ? 'today' : ''}" 
                    style="opacity:${opacity}" 
                    title="${dateStr}: ${count} 次活动"
                    data-date="${dateStr}" data-count="${count}"></div>`;
            }
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
    },

    renderMilestones() {
        const container = document.getElementById('tl-milestones-grid');
        if (!container) return;

        container.innerHTML = this.milestones.map((m, i) => `
            <div class="tl-milestone-card ${m.achieved ? 'achieved' : 'locked'}" style="--ms-color: ${m.color}; animation-delay: ${i * 0.1}s">
                <div class="tl-milestone-icon">
                    <i data-lucide="${m.icon}" style="width:28px;height:28px"></i>
                </div>
                <div class="tl-milestone-title">${m.title}</div>
                <div class="tl-milestone-desc">${m.desc}</div>
                ${m.achieved ? '<div class="tl-milestone-badge"><i data-lucide="check" style="width:12px;height:12px"></i></div>' : '<div class="tl-milestone-lock"><i data-lucide="lock" style="width:14px;height:14px"></i></div>'}
            </div>
        `).join('');
    },

    renderTimeline(filter = 'all') {
        const container = document.getElementById('tl-timeline-list');
        if (!container) return;

        const filtered = filter === 'all' ? this.activities : this.activities.filter(a => a.type === filter);
        const grouped = this.groupByDate(filtered.slice(0, 50));

        let html = '';
        for (const [date, items] of Object.entries(grouped)) {
            html += `<div class="tl-timeline-date">${this.formatDateLabel(date)}</div>`;
            items.forEach((item, i) => {
                html += `
                    <div class="tl-timeline-item" style="animation-delay: ${i * 0.05}s">
                        <div class="tl-timeline-dot" style="background: ${this.getTypeColor(item.type)}"></div>
                        <div class="tl-timeline-card">
                            <div class="tl-timeline-card-header">
                                <i data-lucide="${item.icon}" style="width:16px;height:16px;color:${this.getTypeColor(item.type)}"></i>
                                <span class="tl-timeline-card-title">${item.title}</span>
                                <span class="tl-timeline-card-time">${new Date(item.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            ${item.desc ? `<div class="tl-timeline-card-desc">${item.desc}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        if (filtered.length === 0) {
            html = '<div class="tl-empty"><i data-lucide="inbox" style="width:48px;height:48px;opacity:0.3"></i><p>暂无活动记录</p></div>';
        }

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    groupByDate(items) {
        const groups = {};
        items.forEach(item => {
            const date = new Date(item.date).toISOString().split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    },

    formatDateLabel(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toISOString().split('T')[0]) return '今天';
        if (dateStr === yesterday.toISOString().split('T')[0]) return '昨天';
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    },

    getTypeColor(type) {
        const colors = { task: '#6366f1', review: '#f59e0b', milestone: '#22c55e' };
        return colors[type] || '#94a3b8';
    },

    calculateStreak() {
        const dates = new Set(this.activities.map(a => new Date(a.date).toISOString().split('T')[0]));
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (dates.has(d.toISOString().split('T')[0])) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    },

    updateStats() {
        const streakEl = document.getElementById('tl-streak');
        const totalEl = document.getElementById('tl-total-activities');
        const msEl = document.getElementById('tl-milestones-count');
        if (streakEl) streakEl.textContent = this.calculateStreak();
        if (totalEl) totalEl.textContent = this.activities.length;
        if (msEl) msEl.textContent = this.milestones.filter(m => m.achieved).length;
    },

    filterBy(type) {
        document.querySelectorAll('.tl-filter-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        this.renderTimeline(type);
    }
};

window.TrainingTimeline = TrainingTimeline;
