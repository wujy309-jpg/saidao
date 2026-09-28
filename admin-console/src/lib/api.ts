/** 后台管理平台 API 封装：独立登录态（与主站互不影响） */

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 401/403 统一跳转登录 */
export function forceLogin() {
  clearAuth();
  const base = import.meta.env.VITE_ROUTER_BASE || '/admin';
  window.location.href = base + '/login';
}

/** 主站入口（开发模式指向主站 vite 5174，生产同域 /api/） */
export const MAIN_SITE_URL = import.meta.env.DEV ? 'http://localhost:5174/' : '/api/';

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    /** 登录等接口置 true：401/403 不跳登录，直接抛后端错误信息 */
    skipAuthRedirect?: boolean;
  } = {}
): Promise<T> {
  const { method = 'GET', body, params, skipAuthRedirect } = options;

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

  if ((resp.status === 401 || resp.status === 403) && !skipAuthRedirect) {
    forceLogin();
    throw new ApiError('登录已失效，请重新登录', resp.status);
  }

  if (!resp.ok || (payload && !payload.success)) {
    throw new ApiError(
      payload?.message || `请求失败 (${resp.status})`,
      resp.status
    );
  }

  return (payload?.data ?? null) as T;
}

/** 简易 toast */
export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  let container = document.getElementById('toast-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-root';
    container.className =
      'fixed top-5 right-5 z-[100] flex flex-col items-end gap-2 pointer-events-none';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const palette =
    type === 'success' ? 'bg-brand-600' : type === 'error' ? 'bg-red-600' : 'bg-zinc-800';
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

/** 金额展示：元，保留 2 位 */
export function fmtYuan(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 数字千分位 */
export function fmtNum(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString('zh-CN');
}

/** 时间格式化 */
export function fmtTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const TX_TYPE_META: Record<string, { label: string; cls: string }> = {
  RECHARGE: { label: '订单充值', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  CARD: { label: '卡密兑换', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  CONSUME: { label: 'AI 扣费', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  REFUND: { label: '失败退款', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  GRANT: { label: '免费赠送', cls: 'bg-violet-50 text-violet-700 ring-violet-200' },
  ADJUST: { label: '手动调整', cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
};

export const SCENE_META: Record<string, string> = {
  ASSISTANT_CHAT: 'AI 助手对话',
  ASSISTANT_CONTINUE: 'AI 助手续写',
  PLAN_GENERATE: '备赛计划生成',
  PLAN_STREAM: '计划流式生成',
  PLAN_ADJUST: '备赛计划调整',
  TASK_SWAP: '任务换一个',
  RECOMMEND: '竞赛智能推荐',
  FORUM_POLISH: '论坛 AI 润色',
  FORUM_SUGGEST: '论坛 AI 建议',
};

export const ORDER_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '待确认', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PAID: { label: '已到账', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  CANCELLED: { label: '已取消', cls: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
};

export const CHANNEL_META: Record<string, string> = {
  WECHAT: '微信',
  ALIPAY: '支付宝',
  BANK_TRANSFER: '银行转账',
  OTHER: '其他',
};
