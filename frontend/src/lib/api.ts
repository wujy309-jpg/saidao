import type { ApiResponse } from '../types';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';
const PENDING_PROFILE_KEY = 'pendingProfile';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

/** 游客问卷暂存:完成后注册/登录时自动保存画像 */
export function savePendingProfile(profile: unknown) {
  localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
}

export function takePendingProfile(): unknown | null {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  localStorage.removeItem(PENDING_PROFILE_KEY);
}

export function setAuth(token: string, userJson: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, userJson);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  /** true 表示后端因「登录态失效」（token 过期/非法/缺失）拒绝，而非业务规则拒绝 */
  sessionExpired: boolean;
  constructor(message: string, status: number, sessionExpired = false) {
    super(message);
    this.status = status;
    this.sessionExpired = sessionExpired;
  }
}

/* ================= 登录态失效的统一处理 =================
 * 背景：JWT 有效期 24 小时，过期后所有接口都返回 403，但页面往往只在成功分支渲染错误，
 * 于是表现为「骨架屏永远转圈、顶部却还显示着已登录的用户名」。
 * 这里统一识别失效、清掉本地登录态并广播给外层（由路由跳登录页）。
 */

type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();
let authExpiredNotified = false;

/** 订阅登录态失效；返回取消订阅函数 */
export function onAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

/** 登录成功后重置，使下一次失效仍能触发跳转 */
export function resetAuthExpired(): void {
  authExpiredNotified = false;
}

function notifyAuthExpired(): void {
  // 失效瞬间通常有多个并发请求同时被拒，只处理一次，避免重复跳转
  if (authExpiredNotified) return;
  authExpiredNotified = true;
  clearAuth();
  authExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // 单个监听器异常不影响其它监听器
    }
  });
}

/**
 * 是否属于「登录态失效」。
 *
 * 判别依据是响应体形状：Spring Security 的拦截（token 过期/伪造/未带 token）走默认错误体
 * `{timestamp,status,error,path}`，没有业务统一信封的 success 字段；而业务错误一律带信封
 * （`success:false` + `message`，如「只能删除自己的帖子」「仅管理员可操作」）。
 * 所以不能只看 403——否则会把「权限不足」也误判成登录失效，直接把用户踢下线。
 */
function isSessionInvalid(status: number, payload: unknown): boolean {
  const hasEnvelope =
    !!payload && typeof (payload as { success?: unknown }).success === 'boolean';
  if (hasEnvelope) return false;
  return status === 401 || status === 403;
}

/** 取业务错误文案（仅认信封格式，避免把 Spring 默认错误体读成 undefined） */
function envelopeMessage(payload: unknown): string {
  const p = payload as { success?: unknown; message?: unknown } | null;
  if (p && p.success === false && typeof p.message === 'string') {
    return p.message;
  }
  return '';
}

/** 统一生成失败提示 */
function failureMessage(status: number, payload: unknown, sessionExpired: boolean): string {
  return (
    envelopeMessage(payload) ||
    (sessionExpired
      ? '登录已过期，请重新登录'
      : status === 403
        ? '没有权限执行此操作'
        : status === 409
          ? '操作冲突，数据可能已被其他人更新'
          : `请求失败 (${status})`)
  );
}

/** 通用请求封装：自动带 token、统一错误处理 */
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const resp = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = await resp.json();
  } catch {
    // 非 JSON 响应
  }

  if (!resp.ok) {
    const sessionExpired = isSessionInvalid(resp.status, payload);
    if (sessionExpired && getToken()) notifyAuthExpired();
    throw new ApiError(
      failureMessage(resp.status, payload, sessionExpired),
      resp.status,
      sessionExpired
    );
  }

  if (payload && payload.success === false) {
    throw new ApiError(envelopeMessage(payload) || '操作失败', resp.status);
  }

  return (payload?.data ?? null) as T;
}

/**
 * SSE 流式对话请求:
 * - onDelta: 收到增量文本
 * - onEvent: 收到命名事件(done/error/start, data 为解析后的对象)
 * - signal: 传入 AbortSignal 可中断流(中断不触发 onError,用于"暂停"效果)
 */
export async function streamRequest(
  path: string,
  body: unknown,
  handlers: {
    onDelta?: (text: string) => void;
    onEvent?: (event: string, data: unknown) => void;
    onError?: (msg: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let resp: Response;
  try {
    resp = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    // 主动中断:静默返回(暂停场景)
    if (e instanceof DOMException && e.name === 'AbortError') return;
    handlers.onError?.('网络异常,请重试');
    return;
  }

  if (!resp.ok || !resp.body) {
    let payload: unknown = null;
    try {
      payload = await resp.json();
    } catch {
      // ignore
    }
    // resp.ok 为真但无 body 时不是登录态问题
    const sessionExpired = !resp.ok && isSessionInvalid(resp.status, payload);
    if (sessionExpired && getToken()) notifyAuthExpired();
    handlers.onError?.(failureMessage(resp.status, payload, sessionExpired));
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const processLine = (line: string) => {
    if (line.startsWith('event:')) {
      buffer = line.slice(6).trim();
      return;
    }
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      const event = buffer || 'delta';
      buffer = '';
      if (!payload) return;
      try {
        const data = JSON.parse(payload);
        if (event === 'delta' && typeof data?.content === 'string') {
          handlers.onDelta?.(data.content);
        } else if (event === 'done') {
          handlers.onEvent?.('done', data);
        } else if (event === 'error') {
          handlers.onEvent?.('error', data);
        } else {
          handlers.onEvent?.(event, data);
        }
      } catch {
        // 忽略无法解析的帧
      }
    }
  };

  let rest = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const parts = (rest + text).split('\n');
      rest = parts.pop() ?? '';
      for (const part of parts) processLine(part.replace(/\r$/, ''));
    }
    if (rest.trim()) processLine(rest.replace(/\r$/, ''));
  } catch (e) {
    // 流中断:静默结束(暂停场景)
    if (e instanceof DOMException && e.name === 'AbortError') return;
    handlers.onError?.('连接中断');
  }
}

/** multipart 上传请求（文件等，自动带 token；可带查询参数） */
export async function uploadRequest<T>(
  path: string,
  formData: FormData,
  params?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const resp = await fetch(url, { method: 'POST', headers, body: formData });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = await resp.json();
  } catch {
    // 非 JSON 响应
  }

  if (!resp.ok || (payload && payload.success === false)) {
    const sessionExpired = !resp.ok && isSessionInvalid(resp.status, payload);
    if (sessionExpired && getToken()) notifyAuthExpired();
    throw new ApiError(
      failureMessage(resp.status, payload, sessionExpired),
      resp.status,
      sessionExpired
    );
  }
  return (payload?.data ?? null) as T;
}

/** 简易 toast */
export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {  let container = document.getElementById('toast-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-root';
    container.className =
      'fixed top-5 right-5 z-[100] flex flex-col items-end gap-2 pointer-events-none';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const palette =
    type === 'success'
      ? 'bg-brand-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-zinc-800';
  el.className = `${palette} text-white text-sm px-4 py-2.5 rounded-[10px] shadow-lg animate-rise`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => el.remove(), 320);
  }, 2600);
}
