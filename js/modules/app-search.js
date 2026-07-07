/**
 * 搜索模块 - 仅提供扩展功能
 * 主要搜索函数（handleGlobalSearch, performGlobalSearch等）在 app.js 中定义
 */

/**
 * 扩展功能：显示搜索结果（如果app.js中没有则使用此版本）
 */
if (typeof showSearchResults === 'undefined') {
  function showSearchResults(results, query) {
    hideSearchResults();
    
    if (results.length === 0) {
      showToast(`未找到与"${query}"相关的结果`, 'info');
      return;
    }
    
    const container = document.createElement('div');
    container.id = 'search-results';
    container.className = 'search-results-dropdown';
    
    container.innerHTML = `
      <div class="search-results-header">
        <span>找到 ${results.length} 个结果</span>
      </div>
      <div class="search-results-list">
        ${results.slice(0, 10).map((result, index) => `
          <div class="search-result-item" onclick="executeSearchResult(${index})">
            <i data-lucide="${result.icon || 'search'}" class="search-result-icon"></i>
            <div class="search-result-content">
              <div class="search-result-title">${result.name || result.title}</div>
              <div class="search-result-description">${result.description || ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    window.currentSearchResults = results;
    
    const searchBox = document.querySelector('.global-search');
    if (searchBox) {
      searchBox.appendChild(container);
    }
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

/**
 * 扩展功能：隐藏搜索结果
 */
if (typeof hideSearchResults === 'undefined') {
  function hideSearchResults() {
    const results = document.getElementById('search-results');
    if (results) results.remove();
  }
}

/**
 * 扩展功能：执行搜索结果
 */
function executeSearchResult(index) {
  if (window.currentSearchResults && window.currentSearchResults[index]) {
    const result = window.currentSearchResults[index];
    hideSearchResults();
    
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';
    
    if (result.action) {
      result.action();
    } else if (result.key) {
      navigateTo(result.key);
    }
  }
}

/**
 * 扩展功能：初始化离线检测
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
