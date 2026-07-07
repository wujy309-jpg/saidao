/**
 * 路由模块 - 扩展app.js的路由功能
 * 注意：navigateTo 主函数在 app.js 中定义，这里只提供辅助函数
 */

/**
 * 更新活动标签
 */
function updateActiveTab(pageName) {
  if (typeof appState === 'undefined') return;
  
  const existingTab = appState.tabs.find(t => t.page === pageName);
  
  if (!existingTab && typeof ROUTES !== 'undefined') {
    const route = ROUTES[pageName];
    if (route) {
      appState.tabs.push({
        page: pageName,
        name: route.name,
        icon: route.icon
      });
    }
  }
  
  appState.activeTab = pageName;
  renderTabs();
}

/**
 * 渲染标签页
 */
function renderTabs() {
  const tabList = document.getElementById('tab-list');
  if (!tabList || typeof appState === 'undefined') return;
  
  tabList.innerHTML = '';
  
  appState.tabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item ${tab.page === appState.activeTab ? 'active' : ''}`;
    tabEl.innerHTML = `
      <i data-lucide="${tab.icon}" style="width:14px;height:14px"></i>
      <span>${tab.name}</span>
      <button class="tab-close" onclick="closeTab('${tab.page}', event)" title="关闭">
        <i data-lucide="x" style="width:12px;height:12px"></i>
      </button>
    `;
    tabEl.onclick = (e) => {
      if (!e.target.closest('.tab-close')) {
        navigateTo(tab.page);
      }
    };
    tabList.appendChild(tabEl);
  });
  
  // 渲染图标
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * 关闭标签页
 */
function closeTab(pageName, event) {
  if (event) event.stopPropagation();
  if (typeof appState === 'undefined') return;
  
  const index = appState.tabs.findIndex(t => t.page === pageName);
  if (index === -1) return;
  
  appState.tabs.splice(index, 1);
  
  // 如果关闭的是当前标签，导航到最后一个标签
  if (appState.activeTab === pageName) {
    if (appState.tabs.length > 0) {
      const lastTab = appState.tabs[appState.tabs.length - 1];
      navigateTo(lastTab.page);
    } else {
      navigateTo('dashboard');
    }
  } else {
    renderTabs();
  }
}

/**
 * 更新导航菜单高亮
 */
function updateNavHighlight(pageName) {
  // 移除所有高亮
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // 添加当前页面高亮
  const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`) || 
                     document.querySelector(`.nav-link[data-route="${pageName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

/**
 * 显示骨架屏
 */
function showSkeleton() {
  const skeleton = document.getElementById('skeleton-screen');
  const mainContent = document.getElementById('main-content');
  
  if (skeleton) skeleton.style.display = 'block';
  if (mainContent) mainContent.style.display = 'none';
}

/**
 * 隐藏骨架屏
 */
function hideSkeleton() {
  const skeleton = document.getElementById('skeleton-screen');
  const mainContent = document.getElementById('main-content');
  
  if (skeleton) skeleton.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
}
