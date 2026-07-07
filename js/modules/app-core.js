/**
 * 核心模块 - 仅提供扩展功能
 * 主要函数（navigateTo, showMainApp, handleLogin等）在 app.js 中定义
 */

// 确保全局变量存在（兼容性）
(function() {
  // 如果 app.js 中的变量还未定义，创建空的占位
  if (typeof window.ROUTES === 'undefined') {
    window.ROUTES = {};
  }
  if (typeof window.appState === 'undefined') {
    window.appState = { tabs: [], activeTab: null, sidebarCollapsed: false };
  }
})();

/**
 * 扩展功能：快捷键提示
 */
function showShortcutHints() {
  const hasSeenHints = localStorage.getItem('hasSeenShortcutHints');
  if (hasSeenHints) return;
  
  setTimeout(() => {
    const hints = document.createElement('div');
    hints.className = 'keyboard-shortcuts';
    hints.id = 'keyboard-shortcuts';
    hints.innerHTML = `
      <div class="shortcut-hint">
        <span class="shortcut-key">⌘K</span>
        <span>搜索</span>
      </div>
      <div class="shortcut-hint">
        <span class="shortcut-key">⌘B</span>
        <span>侧边栏</span>
      </div>
    `;
    document.body.appendChild(hints);
    
    setTimeout(() => {
      hints.style.opacity = '0';
      setTimeout(() => hints.remove(), 300);
    }, 5000);
    
    localStorage.setItem('hasSeenShortcutHints', 'true');
  }, 2000);
}

/**
 * 扩展功能：离线检测
 */
function initOfflineDetection() {
  window.addEventListener('online', function() {
    hideOfflineIndicator();
    if (typeof showToast === 'function') {
      showToast('网络已恢复连接', 'success');
    }
  });
  
  window.addEventListener('offline', function() {
    showOfflineIndicator();
    if (typeof showToast === 'function') {
      showToast('网络连接已断开', 'warning');
    }
  });
}

function showOfflineIndicator() {
  hideOfflineIndicator();
  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.className = 'offline-indicator';
  indicator.innerHTML = '<span>网络连接已断开</span>';
  document.body.appendChild(indicator);
}

function hideOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  if (indicator) indicator.remove();
}

// 初始化扩展功能
document.addEventListener('DOMContentLoaded', function() {
  initOfflineDetection();
  showShortcutHints();
});
