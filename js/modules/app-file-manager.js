/**
 * 文件管理模块 - 版本控制、预览、拖拽上传
 */

const FileManager = {
    currentMaterialId: null,
    versions: [],
    comments: [],
    
    init() {
        if (typeof this.initDragAndDrop === 'function') {
            try { this.initDragAndDrop(); } catch(e) {}
        }
        if (typeof this.initFilePreview === 'function') {
            try { this.initFilePreview(); } catch(e) {}
        }
        console.log('[FileManager] 已初始化');
    },
    
    initFilePreview() {
        // 文件预览初始化 - 监听ESC关闭预览模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('file-preview-modal');
                if (modal) modal.remove();
            }
        });
    },
    
    initDragAndDrop() {
        const dropZones = document.querySelectorAll('.file-drop-zone');
        dropZones.forEach(zone => this.setupDropZone(zone));
    },
    
    setupDropZone(zone) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.add('drag-over');
        });
        
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files, zone.dataset.materialId);
            }
        });
        
        zone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files, zone.dataset.materialId);
                }
            };
            input.click();
        });
    },
    
    async handleFileUpload(files, materialId) {
        for (const file of files) {
            if (file.size > 50 * 1024 * 1024) {
                showToastNotification({
                    type: 'error',
                    title: '文件过大',
                    message: `文件 ${file.name} 超过50MB限制`
                });
                continue;
            }
            
            await this.uploadFile(file, materialId);
        }
    },
    
    async uploadFile(file, materialId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('materialId', materialId);
        formData.append('uploaderId', getCurrentUserId());
        formData.append('changeDescription', '上传新版本');
        
        try {
            showLoading('正在上传文件...');
            
            const response = await fetch('/api/file-versions/upload', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getAuthToken()
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToastNotification({
                    type: 'success',
                    title: '上传成功',
                    message: `文件 ${file.name} 已上传`
                });
                
                this.loadVersionHistory(materialId);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '上传失败',
                message: error.message
            });
        } finally {
            hideLoading();
        }
    },
    
    async loadVersionHistory(materialId) {
        this.currentMaterialId = materialId;
        
        try {
            const response = await apiRequest(`/file-versions/material/${materialId}`);
            this.versions = response.data || [];
            this.renderVersionHistory();
        } catch (error) {
            console.error('加载版本历史失败:', error);
        }
    },
    
    renderVersionHistory() {
        const container = document.getElementById('version-history-list');
        if (!container) return;
        
        if (this.versions.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无版本历史</div>';
            return;
        }
        
        container.innerHTML = this.versions.map(version => `
            <div class="version-item ${version.isCurrent ? 'current' : ''}" data-version-id="${version.id}">
                <div class="version-header">
                    <span class="version-number">v${version.versionNumber}</span>
                    <span class="version-date">${formatDate(version.createdAt)}</span>
                    ${version.isCurrent ? '<span class="version-badge">当前版本</span>' : ''}
                </div>
                <div class="version-info">
                    <span class="version-file">${version.fileName}</span>
                    <span class="version-size">${this.formatFileSize(version.fileSize)}</span>
                </div>
                ${version.changeDescription ? `<div class="version-desc">${version.changeDescription}</div>` : ''}
                <div class="version-actions">
                    <button class="btn btn-sm" onclick="FileManager.previewVersion(${version.materialId}, ${version.versionNumber})">
                        <i data-lucide="eye"></i> 预览
                    </button>
                    <button class="btn btn-sm" onclick="FileManager.downloadVersion(${version.id})">
                        <i data-lucide="download"></i> 下载
                    </button>
                    ${!version.isCurrent ? `
                        <button class="btn btn-sm btn-warning" onclick="FileManager.rollbackVersion(${version.materialId}, ${version.versionNumber})">
                            <i data-lucide="rotate-ccw"></i> 回滚
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    async previewVersion(materialId, versionNumber) {
        try {
            const version = this.versions.find(v => v.versionNumber === versionNumber);
            if (!version) return;
            
            const previewModal = document.getElementById('file-preview-modal');
            if (!previewModal) {
                this.createPreviewModal();
            }
            
            this.showFilePreview(version);
        } catch (error) {
            console.error('预览失败:', error);
        }
    },
    
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'file-preview-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3 id="preview-title">文件预览</h3>
                    <button class="modal-close" onclick="FileManager.closePreview()">&times;</button>
                </div>
                <div class="modal-body" id="preview-content">
                    <div class="preview-loading">加载中...</div>
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="FileManager.closePreview()">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    showFilePreview(version) {
        const modal = document.getElementById('file-preview-modal');
        const title = document.getElementById('preview-title');
        const content = document.getElementById('preview-content');
        
        title.textContent = version.fileName;
        
        const ext = version.fileName.split('.').pop().toLowerCase();
        const previewableTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'txt', 'md', 'json', 'js', 'css', 'html'];
        
        if (previewableTypes.includes(ext)) {
            if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
                content.innerHTML = `<img src="/api/file-versions/download/${version.id}" alt="${version.fileName}" style="max-width: 100%; height: auto;">`;
            } else if (ext === 'pdf') {
                content.innerHTML = `<iframe src="/api/file-versions/download/${version.id}" style="width: 100%; height: 500px; border: none;"></iframe>`;
            } else {
                content.innerHTML = `<pre><code>${this.escapeHtml(version.content || '无法预览此文件')}</code></pre>`;
            }
        } else {
            content.innerHTML = `
                <div class="preview-not-available">
                    <i data-lucide="file" style="width: 48px; height: 48px;"></i>
                    <p>此文件类型不支持预览</p>
                    <button class="btn btn-primary" onclick="FileManager.downloadVersion(${version.id})">
                        <i data-lucide="download"></i> 下载文件
                    </button>
                </div>
            `;
        }
        
        modal.classList.add('show');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    closePreview() {
        const modal = document.getElementById('file-preview-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    async downloadVersion(versionId) {
        window.open(`/api/file-versions/download/${versionId}`, '_blank');
    },
    
    async rollbackVersion(materialId, versionNumber) {
        if (!confirm(`确定要回滚到版本 v${versionNumber} 吗？`)) {
            return;
        }
        
        try {
            const response = await apiRequest(`/file-versions/material/${materialId}/rollback/${versionNumber}`, {
                method: 'POST'
            });
            
            if (response.success) {
                showToastNotification({
                    type: 'success',
                    title: '回滚成功',
                    message: `已回滚到版本 v${versionNumber}`
                });
                
                this.loadVersionHistory(materialId);
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '回滚失败',
                message: error.message
            });
        }
    },
    
    async loadComments(materialId) {
        try {
            const response = await apiRequest(`/file-versions/comments/material/${materialId}`);
            this.comments = response.data || [];
            this.renderComments();
        } catch (error) {
            console.error('加载评论失败:', error);
        }
    },
    
    renderComments() {
        const container = document.getElementById('file-comments-list');
        if (!container) return;
        
        if (this.comments.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无评论</div>';
            return;
        }
        
        container.innerHTML = this.comments.map(comment => `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-user">${comment.userId}</span>
                    <span class="comment-time">${formatDate(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="btn btn-sm" onclick="FileManager.replyToComment(${comment.id})">回复</button>
                </div>
            </div>
        `).join('');
    },
    
    async addComment(materialId, versionId, content, parentId = null) {
        try {
            const response = await apiRequest('/file-versions/comments', {
                method: 'POST',
                body: JSON.stringify({
                    materialId,
                    versionId,
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
                
                this.loadComments(materialId);
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
            const replyInput = document.getElementById('comment-input');
            if (replyInput) {
                replyInput.value = `@${comment.userId} `;
                replyInput.focus();
                replyInput.dataset.parentId = commentId;
            }
        }
    },
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FileManager.init();
});
