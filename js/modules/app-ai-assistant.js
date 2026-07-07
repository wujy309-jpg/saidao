/**
 * AI助手模块 - 流式响应、多轮对话、代码解释
 */

const AiAssistant = {
    currentConversationId: null,
    conversations: [],
    messages: [],
    isStreaming: false,
    
    init() {
        this.loadConversations();
        console.log('[AiAssistant] AI助手模块已初始化');
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
    
    createChatInterface() {
        return `
            <div class="ai-chat-container">
                <div class="ai-sidebar">
                    <div class="ai-sidebar-header">
                        <h3>AI助手</h3>
                        <button class="btn btn-sm btn-primary" onclick="AiAssistant.newConversation()">
                            <i data-lucide="plus"></i> 新对话
                        </button>
                    </div>
                    <div class="ai-conversation-list" id="ai-conversation-list">
                        ${this.renderConversationList()}
                    </div>
                </div>
                <div class="ai-main">
                    <div class="ai-chat-header" id="ai-chat-header">
                        <h3>选择或创建对话</h3>
                    </div>
                    <div class="ai-messages" id="ai-messages">
                        <div class="ai-welcome">
                            <div class="ai-welcome-icon">
                                <i data-lucide="bot" style="width:64px;height:64px"></i>
                            </div>
                            <h2>AI智能助手</h2>
                            <p>我可以帮助你解答编程问题、解释代码、提供建议</p>
                            <div class="ai-suggestions">
                                <button class="ai-suggestion-btn" onclick="AiAssistant.sendSuggestion('解释一下Java中的多态概念')">
                                    解释Java多态
                                </button>
                                <button class="ai-suggestion-btn" onclick="AiAssistant.sendSuggestion('如何优化SQL查询性能？')">
                                    SQL优化建议
                                </button>
                                <button class="ai-suggestion-btn" onclick="AiAssistant.sendSuggestion('Spring Boot项目最佳实践是什么？')">
                                    Spring Boot最佳实践
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="ai-input-area">
                        <div class="ai-input-wrapper">
                            <textarea id="ai-input" class="ai-input" placeholder="输入你的问题..." rows="1" 
                                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();AiAssistant.sendMessage()}"></textarea>
                            <button class="ai-send-btn" onclick="AiAssistant.sendMessage()" id="ai-send-btn">
                                <i data-lucide="send"></i>
                            </button>
                        </div>
                        <div class="ai-input-footer">
                            <span class="ai-input-hint">Enter 发送，Shift+Enter 换行</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderConversationList() {
        if (this.conversations.length === 0) {
            return '<div class="ai-empty-list">暂无对话</div>';
        }
        
        return this.conversations.map(conv => `
            <div class="ai-conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}" 
                 onclick="AiAssistant.selectConversation(${conv.id})">
                <div class="ai-conversation-title">${conv.title}</div>
                <div class="ai-conversation-time">${formatDate(conv.updatedAt)}</div>
            </div>
        `).join('');
    },
    
    async newConversation() {
        this.currentConversationId = null;
        this.messages = [];
        
        document.getElementById('ai-chat-header').innerHTML = '<h3>新对话</h3>';
        document.getElementById('ai-messages').innerHTML = `
            <div class="ai-welcome">
                <div class="ai-welcome-icon">
                    <i data-lucide="bot" style="width:64px;height:64px"></i>
                </div>
                <h2>开始新对话</h2>
                <p>输入你的问题开始交流</p>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    async selectConversation(conversationId) {
        this.currentConversationId = conversationId;
        
        try {
            const userId = getCurrentUserId();
            const response = await apiRequest(`/ai/conversations/${conversationId}/messages?userId=${userId}`);
            this.messages = response.data || [];
            
            const conv = this.conversations.find(c => c.id === conversationId);
            document.getElementById('ai-chat-header').innerHTML = `<h3>${conv?.title || '对话'}</h3>`;
            
            this.renderMessages();
        } catch (error) {
            console.error('加载对话消息失败:', error);
        }
    },
    
    renderMessages() {
        const container = document.getElementById('ai-messages');
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="ai-welcome">
                    <div class="ai-welcome-icon">
                        <i data-lucide="bot" style="width:64px;height:64px"></i>
                    </div>
                    <h2>开始对话</h2>
                    <p>输入你的问题</p>
                </div>
            `;
        } else {
            container.innerHTML = this.messages.map(msg => this.renderMessage(msg)).join('');
        }
        
        this.scrollToBottom();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    renderMessage(message) {
        const isUser = message.role === 'user';
        const content = this.formatMessageContent(message.content);
        
        return `
            <div class="ai-message ${isUser ? 'ai-message-user' : 'ai-message-assistant'}">
                <div class="ai-message-avatar">
                    <i data-lucide="${isUser ? 'user' : 'bot'}" style="width:20px;height:20px"></i>
                </div>
                <div class="ai-message-content">
                    <div class="ai-message-text">${content}</div>
                    <div class="ai-message-time">${formatDate(message.createdAt)}</div>
                </div>
            </div>
        `;
    },
    
    formatMessageContent(content) {
        if (!content) return '';
        
        content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre class="ai-code-block"><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        content = content.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
        
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
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
        this.autoResizeInput(input);
        
        this.messages.push({
            role: 'user',
            content: message,
            createdAt: new Date().toISOString()
        });
        
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
        
        const assistantMessage = {
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString()
        };
        this.messages.push(assistantMessage);
        
        const container = document.getElementById('ai-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message ai-message-assistant';
        messageDiv.innerHTML = `
            <div class="ai-message-avatar">
                <i data-lucide="bot" style="width:20px;height:20px"></i>
            </div>
            <div class="ai-message-content">
                <div class="ai-message-text" id="ai-streaming-text">
                    <div class="ai-typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(messageDiv);
        this.scrollToBottom();
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        try {
            const response = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getAuthToken()
                },
                body: JSON.stringify({
                    message: message,
                    language: 'java',
                    topic: message
                })
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
                        if (data === '[DONE]') {
                            break;
                        }
                        fullContent += data;
                        
                        const textDiv = document.getElementById('ai-streaming-text');
                        if (textDiv) {
                            textDiv.innerHTML = this.formatMessageContent(fullContent);
                        }
                        this.scrollToBottom();
                    }
                }
            }
            
            assistantMessage.content = fullContent;
            
        } catch (error) {
            console.error('流式响应错误:', error);
            assistantMessage.content = '抱歉，AI服务暂时不可用，请稍后再试。';
        }
        
        this.isStreaming = false;
        
        this.renderMessages();
    },
    
    scrollToBottom() {
        const container = document.getElementById('ai-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },
    
    autoResizeInput(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    },
    
    async explainCode(code, language) {
        try {
            const response = await apiRequest('/ai/explain-code', {
                method: 'POST',
                body: JSON.stringify({ code, language })
            });
            
            if (response.success) {
                this.showCodeExplanation(response.data);
            }
        } catch (error) {
            showToastNotification({
                type: 'error',
                title: '代码解释失败',
                message: error.message
            });
        }
    },
    
    showCodeExplanation(explanation) {
        const modal = document.getElementById('modal-container');
        if (modal) {
            modal.innerHTML = `
                <div class="modal show">
                    <div class="modal-content modal-large">
                        <div class="modal-header">
                            <h3>AI代码解释</h3>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="ai-explanation">${this.formatMessageContent(explanation)}</div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn" onclick="closeModal()">关闭</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AiAssistant.init();
});
