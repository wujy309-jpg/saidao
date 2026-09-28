/** 报名时间相关工具:阶段判定与倒计时 */

export type RegPhase = 'NOT_STARTED' | 'OPEN' | 'CLOSED';

export function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  // 支持 2026-09-01 与 2026-09
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(d.trim());
  if (!m) return null;
  const day = m[3] ? Number(m[3]) : 1;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, day);
  return isNaN(dt.getTime()) ? null : dt;
}

/** 以当天零点比较,返回报名阶段 */
export function regPhase(regStart?: string | null, regEnd?: string | null): RegPhase | null {
  const s = parseDate(regStart);
  const e = parseDate(regEnd);
  if (!s && !e) return null;
  const today = startOfToday();
  if (s && today < s) return 'NOT_STARTED';
  if (e && today > e) return 'CLOSED';
  return 'OPEN';
}

/** 距离某个日期的天数(可为负) */
export function daysUntil(d?: string | null): number | null {
  const dt = parseDate(d);
  if (!dt) return null;
  const today = startOfToday();
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
}

/** 报名截止倒计时文案 */
export function deadlineText(regEnd?: string | null): string | null {
  const d = daysUntil(regEnd);
  if (d === null) return null;
  if (d < 0) return `已截止 ${-d} 天`;
  if (d === 0) return '今天截止';
  if (d === 1) return '明天截止';
  return `还剩 ${d} 天截止`;
}

export const REG_PHASE_META: Record<RegPhase, { label: string; badge: string; text: string }> = {
  NOT_STARTED: {
    label: '未开始报名',
    badge: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
    text: 'text-zinc-400',
  },
  OPEN: {
    label: '报名中',
    badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    text: 'text-emerald-600',
  },
  CLOSED: {
    label: '报名已截止',
    badge: 'bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200',
    text: 'text-zinc-400',
  },
};

/** 是否即将截止(7 天内) */
export function isDeadlineSoon(regEnd?: string | null): boolean {
  const d = daysUntil(regEnd);
  return d !== null && d >= 0 && d <= 7;
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** 日期格式化:2026-09-03 → 9月3日(同年省略年份) */
export function fmtShort(d?: string | null): string {
  const dt = parseDate(d);
  if (!dt) return '—';
  const year = dt.getFullYear();
  const cur = new Date().getFullYear();
  return year === cur ? `${dt.getMonth() + 1}月${dt.getDate()}日` : `${year}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

/** 月视图所需:返回 yyyy-mm-dd 键 */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
