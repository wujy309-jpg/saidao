/**
 * 实时协作白板模块 - Canvas + WebSocket
 */

const CollabWhiteboard = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    currentTool: 'pen',
    currentColor: '#1e293b',
    lineWidth: 3,
    startX: 0,
    startY: 0,
    paths: [],
    shapes: [],
    undoStack: [],
    textInput: null,
    wsConnected: false,

    render() {
        return `
            <div class="wb-container">
                <div class="wb-header">
                    <div class="wb-header-left">
                        <div class="wb-icon-box">
                            <i data-lucide="pen-tool" style="width:28px;height:28px"></i>
                        </div>
                        <div>
                            <h1 class="wb-title">协作白板</h1>
                            <p class="wb-subtitle">团队实时协作绘图 · 支持多人同步绘制</p>
                        </div>
                    </div>
                    <div class="wb-header-right">
                        <div class="wb-users" id="wb-users">
                            <div class="wb-user-avatar" title="你">我</div>
                        </div>
                        <div class="wb-connection-status" id="wb-conn-status">
                            <span class="wb-status-dot"></span>
                            <span>本地模式</span>
                        </div>
                    </div>
                </div>

                <div class="wb-toolbar">
                    <div class="wb-tool-group">
                        <button class="wb-tool-btn active" data-tool="pen" onclick="CollabWhiteboard.setTool('pen')" title="画笔">
                            <i data-lucide="pen" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="line" onclick="CollabWhiteboard.setTool('line')" title="直线">
                            <i data-lucide="minus" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="rect" onclick="CollabWhiteboard.setTool('rect')" title="矩形">
                            <i data-lucide="square" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="circle" onclick="CollabWhiteboard.setTool('circle')" title="圆形">
                            <i data-lucide="circle" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="arrow" onclick="CollabWhiteboard.setTool('arrow')" title="箭头">
                            <i data-lucide="arrow-right" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="text" onclick="CollabWhiteboard.setTool('text')" title="文字">
                            <i data-lucide="type" style="width:18px;height:18px"></i>
                        </button>
                        <button class="wb-tool-btn" data-tool="eraser" onclick="CollabWhiteboard.setTool('eraser')" title="橡皮擦">
                            <i data-lucide="eraser" style="width:18px;height:18px"></i>
                        </button>
                    </div>

                    <div class="wb-divider"></div>

                    <div class="wb-tool-group">
                        <div class="wb-color-picker">
                            <button class="wb-color-btn" style="background:#1e293b" onclick="CollabWhiteboard.setColor('#1e293b')" title="黑色"></button>
                            <button class="wb-color-btn" style="background:#ef4444" onclick="CollabWhiteboard.setColor('#ef4444')" title="红色"></button>
                            <button class="wb-color-btn" style="background:#3b82f6" onclick="CollabWhiteboard.setColor('#3b82f6')" title="蓝色"></button>
                            <button class="wb-color-btn" style="background:#22c55e" onclick="CollabWhiteboard.setColor('#22c55e')" title="绿色"></button>
                            <button class="wb-color-btn" style="background:#f59e0b" onclick="CollabWhiteboard.setColor('#f59e0b')" title="黄色"></button>
                            <button class="wb-color-btn" style="background:#8b5cf6" onclick="CollabWhiteboard.setColor('#8b5cf6')" title="紫色"></button>
                        </div>
                    </div>

                    <div class="wb-divider"></div>

                    <div class="wb-tool-group">
                        <label class="wb-width-label">粗细</label>
                        <input type="range" class="wb-width-slider" min="1" max="20" value="3" oninput="CollabWhiteboard.setWidth(this.value)">
                        <span class="wb-width-value" id="wb-width-value">3</span>
                    </div>

                    <div class="wb-divider"></div>

                    <div class="wb-tool-group">
                        <button class="wb-action-btn" onclick="CollabWhiteboard.undo()" title="撤销 (Ctrl+Z)">
                            <i data-lucide="undo-2" style="width:16px;height:16px"></i>
                            撤销
                        </button>
                        <button class="wb-action-btn" onclick="CollabWhiteboard.redo()" title="重做">
                            <i data-lucide="redo-2" style="width:16px;height:16px"></i>
                            重做
                        </button>
                        <button class="wb-action-btn" onclick="CollabWhiteboard.clearAll()" title="清空画布">
                            <i data-lucide="trash-2" style="width:16px;height:16px"></i>
                            清空
                        </button>
                        <button class="wb-action-btn wb-save-btn" onclick="CollabWhiteboard.saveImage()" title="保存为图片">
                            <i data-lucide="download" style="width:16px;height:16px"></i>
                            保存
                        </button>
                    </div>
                </div>

                <div class="wb-canvas-wrapper">
                    <canvas id="wb-canvas"></canvas>
                </div>
            </div>
        `;
    },

    init() {
        this.canvas = document.getElementById('wb-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.bindEvents();
        this.paths = [];
        this.shapes = [];
        this.undoStack = [];
        if (typeof lucide !== 'undefined') lucide.createIcons();
        console.log('[Whiteboard] 协作白板已初始化');
    },

    resizeCanvas() {
        const wrapper = this.canvas.parentElement;
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;
        this.redraw();
    },

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMouseDown(e.touches[0]); });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onMouseMove(e.touches[0]); });
        this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.onMouseUp(e); });

        window.addEventListener('resize', () => this.resizeCanvas());

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
        });
    },

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },

    onMouseDown(e) {
        const pos = this.getPos(e);
        this.isDrawing = true;
        this.startX = pos.x;
        this.startY = pos.y;

        if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.currentPath = [{
                x: pos.x,
                y: pos.y
            }];
        }

        if (this.currentTool === 'text') {
            this.isDrawing = false;
            this.addTextInput(pos.x, pos.y);
        }
    },

    onMouseMove(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);

        if (this.currentTool === 'pen') {
            this.drawPen(pos);
            if (this.currentPath) {
                this.currentPath.push({
                    x: pos.x,
                    y: pos.y
                });
            }
        } else if (this.currentTool === 'eraser') {
            this.drawEraser(pos);
            if (this.currentPath) {
                this.currentPath.push({
                    x: pos.x,
                    y: pos.y
                });
            }
        } else {
            this.drawPreview(pos);
        }
    },

    onMouseUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const pos = e ? this.getPos(e) : { x: this.startX, y: this.startY };

        if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
            this.ctx.closePath();
            if (this.currentPath && this.currentPath.length > 1) {
                this.shapes.push({
                    tool: this.currentTool,
                    points: [...this.currentPath],
                    color: this.currentTool === 'eraser' ? '#ffffff' : this.currentColor,
                    width: this.currentTool === 'eraser' ? this.lineWidth * 5 : this.lineWidth
                });
            }
            this.currentPath = [];
        }

        if (['line', 'rect', 'circle', 'arrow'].includes(this.currentTool)) {
            this.shapes.push({
                tool: this.currentTool,
                x1: this.startX, y1: this.startY,
                x2: pos.x, y2: pos.y,
                color: this.currentColor,
                width: this.lineWidth
            });
        }

        this.saveState();
        this.redraw();
    },

    drawPen(pos) {
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    },

    drawEraser(pos) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = this.lineWidth * 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    },

    drawPreview(pos) {
        this.redraw();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';

        if (this.currentTool === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (this.currentTool === 'rect') {
            this.ctx.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        } else if (this.currentTool === 'circle') {
            const rx = (pos.x - this.startX) / 2;
            const ry = (pos.y - this.startY) / 2;
            this.ctx.beginPath();
            this.ctx.ellipse(this.startX + rx, this.startY + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (this.currentTool === 'arrow') {
            this.drawArrow(this.ctx, this.startX, this.startY, pos.x, pos.y);
        }
    },

    drawArrow(ctx, x1, y1, x2, y2) {
        const headLen = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    },

    addTextInput(x, y) {
        const existing = document.getElementById('wb-text-input');
        if (existing) existing.remove();

        const wrapper = this.canvas.parentElement;
        const input = document.createElement('textarea');
        input.id = 'wb-text-input';
        input.className = 'wb-text-input';
        input.style.left = x + 'px';
        input.style.top = y + 'px';
        input.style.color = this.currentColor;
        input.style.fontSize = Math.max(14, this.lineWidth * 4) + 'px';
        input.placeholder = '输入文字...';
        wrapper.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            if (input.value.trim()) {
                this.ctx.font = `${Math.max(14, this.lineWidth * 4)}px "Geist Sans", sans-serif`;
                this.ctx.fillStyle = this.currentColor;
                this.ctx.fillText(input.value, x + 4, y + 20);
                this.saveState();
            }
            input.remove();
        });
    },

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.shapes.forEach(shape => {
            this.ctx.strokeStyle = shape.color;
            this.ctx.lineWidth = shape.width;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            if (shape.tool === 'pen' || shape.tool === 'eraser') {
                if (shape.points && shape.points.length > 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                    for (let i = 1; i < shape.points.length; i++) {
                        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
                    }
                    this.ctx.stroke();
                }
            } else if (shape.tool === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x1, shape.y1);
                this.ctx.lineTo(shape.x2, shape.y2);
                this.ctx.stroke();
            } else if (shape.tool === 'rect') {
                this.ctx.strokeRect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
            } else if (shape.tool === 'circle') {
                const rx = (shape.x2 - shape.x1) / 2;
                const ry = (shape.y2 - shape.y1) / 2;
                this.ctx.beginPath();
                this.ctx.ellipse(shape.x1 + rx, shape.y1 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (shape.tool === 'arrow') {
                this.drawArrow(this.ctx, shape.x1, shape.y1, shape.x2, shape.y2);
            }
        });
    },

    saveState() {
        this.undoStack.push(this.canvas.toDataURL());
        if (this.undoStack.length > 30) this.undoStack.shift();
    },

    undo() {
        if (this.undoStack.length === 0) return;
        this.undoStack.pop();
        const prev = this.undoStack[this.undoStack.length - 1];
        if (prev) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
            };
            img.src = prev;
        } else {
            this.redraw();
        }
    },

    redo() {
        showToast('重做功能开发中', 'info');
    },

    clearAll() {
        if (confirm('确定要清空画布吗？')) {
            this.shapes = [];
            this.undoStack = [];
            this.redraw();
        }
    },

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.wb-tool-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`[data-tool="${tool}"]`);
        if (btn) btn.classList.add('active');
        this.canvas.style.cursor = tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair';
    },

    setColor(color) {
        this.currentColor = color;
    },

    setWidth(width) {
        this.lineWidth = parseInt(width);
        const el = document.getElementById('wb-width-value');
        if (el) el.textContent = width;
    },

    saveImage() {
        const link = document.createElement('a');
        link.download = `白板_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        showToast('图片已保存', 'success');
    }
};

window.CollabWhiteboard = CollabWhiteboard;
