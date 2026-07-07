/**
 * WebSocket 实时通信模块
 */

const WebSocketClient = {
    stompClient: null,
    connected: false,
    subscriptions: new Map(),
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    
    connect(userId) {
        if (this.connected) return;
        
        const socket = new SockJS('/api/ws');
        this.stompClient = Stomp.over(socket);
        this.stompClient.debug = null;
        
        const headers = {
            'Authorization': 'Bearer ' + getAuthToken()
        };
        
        this.stompClient.connect(headers, 
            () => this.onConnected(userId),
            (error) => this.onError(error)
        );
    },
    
    onConnected(userId) {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[WebSocket] 已连接');
        
        this.subscribeToNotifications(userId);
        this.subscribeToProjectUpdates();
        
        this.showConnectionStatus('connected');
    },
    
    onError(error) {
        console.error('[WebSocket] 连接错误:', error);
        this.connected = false;
        this.showConnectionStatus('disconnected');
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect(getCurrentUser()?.id);
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    },
    
    subscribeToNotifications(userId) {
        if (!this.stompClient || !this.connected) return;
        
        const subscription = this.stompClient.subscribe(
            `/user/${userId}/queue/notifications`,
            (message) => {
                const notification = JSON.parse(message.body);
                this.handleNotification(notification);
            }
        );
        
        this.subscriptions.set('notifications', subscription);
    },
    
    subscribeToProjectUpdates() {
        if (!this.stompClient || !this.connected) return;
        
        const subscription = this.stompClient.subscribe('/topic/notifications', (message) => {
            const notification = JSON.parse(message.body);
            this.handleNotification(notification);
        });
        
        this.subscriptions.set('global-notifications', subscription);
    },
    
    subscribeToProject(projectId) {
        if (!this.stompClient || !this.connected) return;
        
        const subscription = this.stompClient.subscribe(
            `/topic/project/${projectId}`,
            (message) => {
                const update = JSON.parse(message.body);
                this.handleProjectUpdate(update);
            }
        );
        
        this.subscriptions.set(`project-${projectId}`, subscription);
    },
    
    subscribeToProjectTasks(projectId) {
        if (!this.stompClient || !this.connected) return;
        
        const subscription = this.stompClient.subscribe(
            `/topic/project/${projectId}/tasks`,
            (message) => {
                const update = JSON.parse(message.body);
                this.handleTaskUpdate(update);
            }
        );
        
        this.subscriptions.set(`project-tasks-${projectId}`, subscription);
    },
    
    unsubscribe(subscriptionKey) {
        const subscription = this.subscriptions.get(subscriptionKey);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subscriptionKey);
        }
    },
    
    send(destination, message) {
        if (!this.stompClient || !this.connected) {
            console.error('[WebSocket] 未连接，无法发送消息');
            return;
        }
        
        this.stompClient.send(destination, {}, JSON.stringify(message));
    },
    
    handleNotification(notification) {
        console.log('[WebSocket] 收到通知:', notification);
        
        this.showToast(notification);
        this.updateNotificationCount();
        this.playNotificationSound();
    },
    
    handleProjectUpdate(update) {
        console.log('[WebSocket] 项目更新:', update);
        
        if (typeof refreshProjectData === 'function') {
            refreshProjectData(update.projectId);
        }
    },
    
    handleTaskUpdate(update) {
        console.log('[WebSocket] 任务更新:', update);
        
        if (typeof refreshTaskData === 'function') {
            refreshTaskData(update.projectId);
        }
    },
    
    showToast(notification) {
        if (typeof showToastNotification === 'function') {
            showToastNotification({
                type: notification.type || 'info',
                title: notification.title || '新通知',
                message: notification.content || ''
            });
        }
    },
    
    updateNotificationCount() {
        const badge = document.getElementById('notification-count');
        if (badge) {
            let count = parseInt(badge.textContent) || 0;
            count++;
            badge.textContent = count;
            badge.style.display = 'flex';
        }
    },
    
    playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch (e) {}
    },
    
    showConnectionStatus(status) {
        const statusIndicator = document.getElementById('ws-status');
        if (statusIndicator) {
            statusIndicator.className = `ws-status ws-status-${status}`;
            statusIndicator.title = status === 'connected' ? '实时连接正常' : '连接已断开';
        }
    },
    
    disconnect() {
        if (this.stompClient) {
            this.stompClient.disconnect();
            this.connected = false;
            this.subscriptions.clear();
            console.log('[WebSocket] 已断开连接');
        }
    }
};

window.addEventListener('beforeunload', () => {
    WebSocketClient.disconnect();
});
