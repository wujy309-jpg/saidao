import type { ApiResponse } from './types';

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
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
    const msg =
      payload && !payload.success
        ? payload.message
        : resp.status === 401
          ? '登录已过期，请重新登录'
          : resp.status === 403
            ? '没有权限执行此操作'
            : `请求失败 (${resp.status})`;
    throw new ApiError(msg, resp.status);
  }

  if (payload && !payload.success) {
    throw new ApiError(payload.message || '操作失败', resp.status);
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
    let msg = `请求失败 (${resp.status})`;
    try {
      const p = await resp.json();
      if (p && !p.success) msg = p.message || msg;
    } catch {
      // ignore
    }
    handlers.onError?.(msg);
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

  if (!resp.ok || (payload && !payload.success)) {
    throw new ApiError(
      payload?.message || `上传失败 (${resp.status})`,
      resp.status
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
