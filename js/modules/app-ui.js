/**
 * UI模块 - 仅提供扩展功能
 * 主要UI函数（showToast, showModal, toggleSidebar等）在 app.js 中定义
 */

/**
 * 扩展功能：切换移动端菜单
 */
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('show');
}

/**
 * 扩展功能：关闭移动端菜单
 */
function closeMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('show');
}

/**
 * 扩展功能：切换用户菜单
 */
function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.classList.toggle('show');
}

/**
 * 扩展功能：关闭用户菜单弹窗
 */
function closeUserMenuPopup() {
  const popup = document.getElementById('user-menu-popup');
  if (popup) popup.classList.remove('show');
}

/**
 * 扩展功能：显示确认对话框
 */
function showConfirm(message, onConfirm) {
  if (confirm(message)) {
    onConfirm();
  }
}
