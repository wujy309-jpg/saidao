/**
 * 认证模块 - 仅提供扩展功能
 * 主要认证函数（handleLogin, handleLogout等）在 app.js 中定义
 */

/**
 * 扩展功能：显示登录错误
 */
function showLoginError(message) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 3000);
  }
}

/**
 * 扩展功能：填充演示账号
 */
function fillDemoAccount(username, password) {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  if (usernameInput) usernameInput.value = username;
  if (passwordInput) passwordInput.value = password;
  if (usernameInput) usernameInput.focus();
}
