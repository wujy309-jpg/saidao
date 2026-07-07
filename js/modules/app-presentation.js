/**
 * 答辩/演示模式模块 - 幻灯片展示
 */

const PresentationMode = {
    currentSlide: 0,
    slides: [],
    isFullscreen: false,

    render() {
        return `
            <div class="pm-container">
                <div class="pm-header">
                    <div class="pm-header-left">
                        <div class="pm-icon-box">
                            <i data-lucide="presentation" style="width:28px;height:28px"></i>
                        </div>
                        <div>
                            <h1 class="pm-title">答辩 / 演示模式</h1>
                            <p class="pm-subtitle">一键生成项目答辩幻灯片 · 适合期末答辩投屏展示</p>
                        </div>
                    </div>
                    <div class="pm-header-actions">
                        <button class="pm-start-btn" onclick="PresentationMode.start()">
                            <i data-lucide="play" style="width:18px;height:18px"></i>
                            开始演示
                        </button>
                    </div>
                </div>

                <div class="pm-preview-section">
                    <h3 class="pm-section-title"><i data-lucide="eye" style="width:18px;height:18px"></i> 幻灯片预览</h3>
                    <div class="pm-slides-grid" id="pm-slides-grid"></div>
                </div>

                <div class="pm-config-section">
                    <h3 class="pm-section-title"><i data-lucide="settings" style="width:18px;height:18px"></i> 演示设置</h3>
                    <div class="pm-config-options">
                        <label class="pm-checkbox-item">
                            <input type="checkbox" id="pm-show-stats" checked> 显示统计数据
                        </label>
                        <label class="pm-checkbox-item">
                            <input type="checkbox" id="pm-show-team" checked> 显示团队信息
                        </label>
                        <label class="pm-checkbox-item">
                            <input type="checkbox" id="pm-show-timeline" checked> 显示项目时间线
                        </label>
                        <label class="pm-checkbox-item">
                            <input type="checkbox" id="pm-auto-play"> 自动播放 (每5秒)
                        </label>
                    </div>
                </div>
            </div>

            <div id="pm-overlay" class="pm-overlay" style="display:none">
                <div class="pm-slide-container" id="pm-slide-container"></div>
                <div class="pm-controls">
                    <button class="pm-ctrl-btn" onclick="PresentationMode.prev()"><i data-lucide="chevron-left" style="width:24px;height:24px"></i></button>
                    <span class="pm-slide-counter" id="pm-slide-counter">1 / 8</span>
                    <button class="pm-ctrl-btn" onclick="PresentationMode.next()"><i data-lucide="chevron-right" style="width:24px;height:24px"></i></button>
                    <button class="pm-ctrl-btn pm-exit-btn" onclick="PresentationMode.exit()"><i data-lucide="x" style="width:24px;height:24px"></i></button>
                </div>
            </div>
        `;
    },

    init() {
        this.generateSlides();
        this.renderPreview();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    generateSlides() {
        const currentUser = getCurrentUser();
        const projects = typeof dataManager !== 'undefined' ? dataManager.getProjects() : [];
        const tasks = typeof dataManager !== 'undefined' ? dataManager.getTasks({}) : [];
        const completedTasks = (tasks || []).filter(t => t.status === 'COMPLETED').length;
        const totalTasks = (tasks || []).length || 1;

        this.slides = [
            {
                type: 'cover',
                title: '软件实训全流程管理与评价系统',
                subtitle: '项目答辩演示',
                footer: `${currentUser?.name || '团队'} | ${new Date().toLocaleDateString('zh-CN')}`,
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            {
                type: 'agenda',
                title: '目录',
                items: ['项目概述', '系统架构', '核心功能演示', '技术亮点', '数据统计', '团队分工', '总结与展望'],
                bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            },
            {
                type: 'overview',
                title: '项目概述',
                content: '本系统是一个完整的软件实训管理平台，支持多角色（管理员、教师、学生、企业导师）的实训任务管理、过程记录、评价反馈和数据分析功能。',
                highlights: ['多角色权限管理', '全流程任务追踪', 'AI智能辅助', '实时协作'],
                bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            },
            {
                type: 'architecture',
                title: '系统架构',
                techStack: {
                    frontend: ['HTML5 + CSS3 + JavaScript', 'Chart.js + ECharts 数据可视化', 'WebSocket 实时通信', '响应式设计 + PWA'],
                    backend: ['Spring Boot 3.2.0', 'Spring Security + JWT', 'Spring Data JPA', 'MySQL / H2 数据库']
                },
                bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            },
            {
                type: 'features',
                title: '核心功能',
                features: [
                    { icon: 'clipboard-list', name: '任务管理', desc: '拖拽看板、智能排期' },
                    { icon: 'bot', name: 'AI 助手', desc: '代码审查、智能问答' },
                    { icon: 'star', name: '评价系统', desc: '多维度评价、雷达图' },
                    { icon: 'code-2', name: '代码仓库', desc: '版本管理、协作开发' },
                    { icon: 'bar-chart', name: '数据大屏', desc: '实时统计、可视化' },
                    { icon: 'users', name: '团队协作', desc: '实时白板、消息通知' }
                ],
                bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
            },
            {
                type: 'stats',
                title: '项目数据',
                stats: [
                    { label: '任务总数', value: totalTasks, icon: 'clipboard-list' },
                    { label: '完成率', value: Math.round(completedTasks / totalTasks * 100) + '%', icon: 'check-circle' },
                    { label: '代码行数', value: '15,000+', icon: 'code-2' },
                    { label: 'API接口', value: '30+', icon: 'server' }
                ],
                bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
            },
            {
                type: 'team',
                title: '团队分工',
                members: [
                    { name: '前端开发', tasks: '页面设计、交互实现、数据可视化', ratio: '35%' },
                    { name: '后端开发', tasks: 'API设计、业务逻辑、数据库', ratio: '35%' },
                    { name: '测试部署', tasks: '功能测试、性能优化、部署上线', ratio: '15%' },
                    { name: '文档整理', tasks: '需求文档、接口文档、用户手册', ratio: '15%' }
                ],
                bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
            },
            {
                type: 'closing',
                title: '感谢聆听',
                subtitle: 'Thank You',
                content: '欢迎提问与交流',
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }
        ];
    },

    renderPreview() {
        const container = document.getElementById('pm-slides-grid');
        if (!container) return;

        container.innerHTML = this.slides.map((slide, i) => `
            <div class="pm-preview-card" onclick="PresentationMode.jumpTo(${i})" style="animation-delay:${i * 0.08}s">
                <div class="pm-preview-thumb" style="background:${slide.bg}">
                    <div class="pm-preview-number">${i + 1}</div>
                </div>
                <div class="pm-preview-title">${slide.title}</div>
            </div>
        `).join('');
    },

    start() {
        this.currentSlide = 0;
        const overlay = document.getElementById('pm-overlay');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.renderCurrentSlide();
        this.bindKeys();

        if (document.getElementById('pm-auto-play')?.checked) {
            this._autoPlayTimer = setInterval(() => this.next(), 5000);
        }
    },

    exit() {
        document.getElementById('pm-overlay').style.display = 'none';
        document.body.style.overflow = '';
        this.unbindKeys();
        if (this._autoPlayTimer) {
            clearInterval(this._autoPlayTimer);
            this._autoPlayTimer = null;
        }
    },

    bindKeys() {
        this._keyHandler = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
            if (e.key === 'Escape') this.exit();
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    unbindKeys() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    next() {
        if (this.currentSlide < this.slides.length - 1) {
            this.currentSlide++;
            this.renderCurrentSlide();
        }
    },

    prev() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.renderCurrentSlide();
        }
    },

    jumpTo(index) {
        this.currentSlide = index;
        this.start();
    },

    renderCurrentSlide() {
        const container = document.getElementById('pm-slide-container');
        const counter = document.getElementById('pm-slide-counter');
        if (!container) return;

        const slide = this.slides[this.currentSlide];
        counter.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;

        container.className = 'pm-slide-container pm-slide-enter';
        container.innerHTML = this.renderSlideContent(slide);

        setTimeout(() => { container.className = 'pm-slide-container'; }, 50);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderSlideContent(slide) {
        switch (slide.type) {
            case 'cover':
                return `
                    <div class="pm-slide pm-slide-cover" style="background:${slide.bg}">
                        <div class="pm-slide-content">
                            <h1 class="pm-slide-main-title">${slide.title}</h1>
                            <p class="pm-slide-subtitle">${slide.subtitle}</p>
                            <div class="pm-slide-footer">${slide.footer}</div>
                        </div>
                        <div class="pm-slide-decoration">
                            <div class="pm-deco-circle c1"></div>
                            <div class="pm-deco-circle c2"></div>
                            <div class="pm-deco-circle c3"></div>
                        </div>
                    </div>
                `;
            case 'agenda':
                return `
                    <div class="pm-slide pm-slide-agenda" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <div class="pm-agenda-list">
                            ${slide.items.map((item, i) => `
                                <div class="pm-agenda-item" style="animation-delay:${i * 0.1}s">
                                    <span class="pm-agenda-num">${String(i + 1).padStart(2, '0')}</span>
                                    <span>${item}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            case 'overview':
                return `
                    <div class="pm-slide pm-slide-overview" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <p class="pm-overview-text">${slide.content}</p>
                        <div class="pm-highlights">
                            ${slide.highlights.map((h, i) => `
                                <div class="pm-highlight-card" style="animation-delay:${i * 0.1}s">
                                    <i data-lucide="check-circle" style="width:24px;height:24px"></i>
                                    <span>${h}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            case 'architecture':
                return `
                    <div class="pm-slide pm-slide-arch" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <div class="pm-arch-grid">
                            <div class="pm-arch-card">
                                <h3><i data-lucide="monitor" style="width:20px;height:20px"></i> 前端技术</h3>
                                <ul>${slide.techStack.frontend.map(t => `<li>${t}</li>`).join('')}</ul>
                            </div>
                            <div class="pm-arch-card">
                                <h3><i data-lucide="server" style="width:20px;height:20px"></i> 后端技术</h3>
                                <ul>${slide.techStack.backend.map(t => `<li>${t}</li>`).join('')}</ul>
                            </div>
                        </div>
                    </div>
                `;
            case 'features':
                return `
                    <div class="pm-slide pm-slide-features" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <div class="pm-features-grid">
                            ${slide.features.map((f, i) => `
                                <div class="pm-feature-card" style="animation-delay:${i * 0.08}s">
                                    <i data-lucide="${f.icon}" style="width:32px;height:32px"></i>
                                    <h3>${f.name}</h3>
                                    <p>${f.desc}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            case 'stats':
                return `
                    <div class="pm-slide pm-slide-stats" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <div class="pm-stats-grid">
                            ${slide.stats.map((s, i) => `
                                <div class="pm-stat-card" style="animation-delay:${i * 0.1}s">
                                    <i data-lucide="${s.icon}" style="width:36px;height:36px"></i>
                                    <div class="pm-stat-value">${s.value}</div>
                                    <div class="pm-stat-label">${s.label}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            case 'team':
                return `
                    <div class="pm-slide pm-slide-team" style="background:${slide.bg}">
                        <h1>${slide.title}</h1>
                        <div class="pm-team-grid">
                            ${slide.members.map((m, i) => `
                                <div class="pm-team-card" style="animation-delay:${i * 0.1}s">
                                    <div class="pm-team-avatar">${m.name.charAt(0)}</div>
                                    <h3>${m.name}</h3>
                                    <p>${m.tasks}</p>
                                    <div class="pm-team-ratio">${m.ratio}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            case 'closing':
                return `
                    <div class="pm-slide pm-slide-closing" style="background:${slide.bg}">
                        <div class="pm-slide-content">
                            <h1 class="pm-closing-title">${slide.title}</h1>
                            <p class="pm-closing-subtitle">${slide.subtitle}</p>
                            <p class="pm-closing-text">${slide.content}</p>
                        </div>
                        <div class="pm-slide-decoration">
                            <div class="pm-deco-circle c1"></div>
                            <div class="pm-deco-circle c2"></div>
                        </div>
                    </div>
                `;
            default:
                return '<div class="pm-slide">未知幻灯片类型</div>';
        }
    }
};

window.PresentationMode = PresentationMode;
