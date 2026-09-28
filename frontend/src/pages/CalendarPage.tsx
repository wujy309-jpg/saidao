import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  Flag,
  Heart,
  ListBullets,
  CalendarBlank,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { FORMAT_META, LEVEL_META } from '../lib/labels';
import { dateKey, daysUntil, fmtShort, parseDate, regPhase } from '../lib/dates';
import type { Competition, MyCompetitionItem } from '../lib/types';
import { Button, Card, Skeleton } from '../components/ui';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

type Mode = 'mine' | 'all';
type View = 'month' | 'agenda';
type EventType = 'regStart' | 'deadline' | 'contest';

interface CalEvent {
  type: EventType;
  key: string; // dateKey
  date: Date;
  comp: Competition;
}

const EVENT_META: Record<EventType, { label: string; chip: string; badge: string; dot: string }> = {
  regStart: {
    label: '报名',
    chip: 'bg-brand-100 text-brand-800',
    badge: 'bg-brand-100 text-brand-800',
    dot: 'bg-brand-500',
  },
  deadline: {
    label: '截止',
    chip: 'bg-red-50 text-red-500',
    badge: 'bg-red-50 text-red-500',
    dot: 'bg-red-500',
  },
  contest: {
    label: '比赛',
    chip: 'bg-sky-50 text-sky-700',
    badge: 'bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
  },
};

const FILTERS: { type: EventType; label: string; on: string }[] = [
  { type: 'regStart', label: '报名开始', on: 'bg-brand-100 text-brand-800 ring-brand-300' },
  { type: 'deadline', label: '报名截止', on: 'bg-red-50 text-red-500 ring-red-200' },
  { type: 'contest', label: '比赛时间', on: 'bg-sky-50 text-sky-700 ring-sky-200' },
];

export default function CalendarPage() {
  const [mode, setMode] = useState<Mode>('mine');
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'agenda' : 'month'
  );
  const [all, setAll] = useState<Competition[]>([]);
  const [mine, setMine] = useState<Competition[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(dateKey(new Date()));
  const [filters, setFilters] = useState<Set<EventType>>(
    new Set(['regStart', 'deadline', 'contest'])
  );

  useEffect(() => {
    Promise.all([
      request<Competition[]>('/api/competitions').catch(() => [] as Competition[]),
      request<MyCompetitionItem[]>('/api/competitions/mine').catch(() => [] as MyCompetitionItem[]),
    ])
      .then(([a, m]) => {
        setAll(a ?? []);
        setMine((m ?? []).map((i) => i.competition).filter(Boolean));
        setFavoriteIds(new Set((m ?? []).map((i) => i.competition.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const source = mode === 'mine' ? mine : all;

  // 全部事件(按筛选)
  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    for (const c of source) {
      if (filters.has('regStart')) {
        const d = parseDate(c.registrationStart);
        if (d) out.push({ type: 'regStart', key: dateKey(d), date: d, comp: c });
      }
      if (filters.has('deadline')) {
        const d = parseDate(c.registrationEnd);
        if (d) out.push({ type: 'deadline', key: dateKey(d), date: d, comp: c });
      }
      if (filters.has('contest')) {
        const d = parseDate(c.competitionDate);
        if (d) out.push({ type: 'contest', key: dateKey(d), date: d, comp: c });
      }
    }
    return out;
  }, [source, filters]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const list = map.get(e.key) ?? [];
      list.push(e);
      map.set(e.key, list);
    }
    // 同一天内:截止排最前
    for (const list of map.values()) {
      list.sort((a, b) => {
        const order = { deadline: 0, contest: 1, regStart: 2 } as Record<EventType, number>;
        return order[a.type] - order[b.type];
      });
    }
    return map;
  }, [events]);

  const dayEvents = eventsByDay.get(selected) ?? [];

  // 未来 60 天截止
  const upcomingDeadlines = useMemo(() => {
    return source
      .filter((c) => {
        const d = daysUntil(c.registrationEnd);
        const p = regPhase(c.registrationStart, c.registrationEnd);
        return d !== null && d >= 0 && d <= 60 && p === 'OPEN';
      })
      .sort((a, b) => (daysUntil(a.registrationEnd) ?? 999) - (daysUntil(b.registrationEnd) ?? 999));
  }, [source]);

  // 议程:未来 90 天,按月份分组
  const agendaGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today.getTime() + 90 * 86400000);
    const filtered = events
      .filter((e) => e.date >= today && e.date <= limit)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const groups: { label: string; items: CalEvent[] }[] = [];
    let cur: { label: string; items: CalEvent[] } | null = null;
    for (const e of filtered) {
      const label = `${e.date.getFullYear()} 年 ${MONTH_NAMES[e.date.getMonth()]}`;
      if (!cur || cur.label !== label) {
        cur = { label, items: [] };
        groups.push(cur);
      }
      cur.items.push(e);
    }
    return groups;
  }, [events]);

  const monthLabel = `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;
  const daysInMonth = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const cells: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [cursor]);

  const toggleFilter = (t: EventType) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleFavorite = async (comp: Competition) => {
    try {
      const nowFav = await request<boolean>(`/api/competitions/${comp.id}/favorite`, {
        method: 'POST',
      });
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (nowFav) next.add(comp.id);
        else next.delete(comp.id);
        return next;
      });
      if (mode === 'mine') {
        if (nowFav) {
          setMine((prev) => (prev.some((c) => c.id === comp.id) ? prev : [...prev, comp]));
        } else {
          setMine((prev) => prev.filter((c) => c.id !== comp.id));
        }
      }
      toast(nowFav ? '已收藏,会出现在你的日历' : '已取消收藏', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const selectedDayDate = (() => {
    const [y, m, d] = selected.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();
  const selectedDayLabel = `${selectedDayDate.getMonth() + 1}月${selectedDayDate.getDate()}日 · 周${WEEKDAYS[(selectedDayDate.getDay() + 6) % 7]}`;

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">赛程日历</h1>
          <p className="mt-1 text-sm text-zinc-400">
            报名窗口与比赛时间一目了然,点选日期查看当日安排
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('mine')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'mine'
                ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(5,150,105,.3)]'
                : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-brand-300'
            }`}
          >
            我的关注
          </button>
          <button
            onClick={() => setMode('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'all'
                ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(5,150,105,.3)]'
                : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-brand-300'
            }`}
          >
            全部竞赛
          </button>
        </div>
      </div>

      {/* 工具栏:月导航 + 今天 + 视图切换 + 事件筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        {view === 'month' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-[10px] border border-emerald-900/10 bg-white p-2 text-zinc-500 shadow-[var(--shadow-card)] transition-colors hover:text-brand-700"
              title="上个月"
            >
              <CaretLeft size={16} />
            </button>
            <span className="min-w-[104px] text-center text-[15px] font-bold text-zinc-800">
              {monthLabel}
            </span>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-[10px] border border-emerald-900/10 bg-white p-2 text-zinc-500 shadow-[var(--shadow-card)] transition-colors hover:text-brand-700"
              title="下个月"
            >
              <CaretRight size={16} />
            </button>
            <Button
              variant="outline"
              className="!px-3 !py-1.5 text-xs"
              onClick={() => {
                const t = new Date();
                setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
                setSelected(dateKey(t));
              }}
            >
              今天
            </Button>
          </div>
        )}

        <div className="flex rounded-full bg-zinc-200/70 p-0.5">
          {(
            [
              ['month', '月'],
              ['agenda', '议程'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                view === v ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'
              }`}
            >
              {v === 'agenda' && <ListBullets size={12} />}
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const on = filters.has(f.type);
            return (
              <button
                key={f.type}
                onClick={() => toggleFilter(f.type)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all ${
                  on
                    ? `${f.on} font-semibold ring-1`
                    : 'bg-white text-zinc-400 ring-1 ring-zinc-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${EVENT_META[f.type].dot} ${on ? '' : 'opacity-40'}`}
                />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 我的关注为空引导 */}
      {mode === 'mine' && mine.length === 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-zinc-500">还没有收藏比赛,日历会展示你关注的竞赛赛程</p>
          <Link to="/competitions" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
            去竞赛库逛逛 →
          </Link>
        </Card>
      )}

      {view === 'month' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          {/* 月视图 */}
          <Card className="p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <span key={w} className="pb-2 text-center text-xs text-zinc-400">
                  周{w}
                </span>
              ))}
              {daysInMonth.map((d, i) => {
                if (!d) return <div key={`x${i}`} />;
                const k = dateKey(d);
                const evs = eventsByDay.get(k) ?? [];
                const isToday = k === dateKey(new Date());
                const isSel = k === selected;
                return (
                  <button
                    key={k}
                    onClick={() => setSelected(k)}
                    className={`flex min-h-[84px] flex-col items-stretch gap-1.5 rounded-[10px] p-2 text-left transition-all ${
                      isSel
                        ? 'bg-brand-50 shadow-[inset_0_0_0_2px_var(--color-brand-500)]'
                        : isToday
                          ? 'bg-brand-50/60 ring-1 ring-brand-200'
                          : 'bg-canvas hover:bg-[#eef2eb] hover:shadow-[inset_0_0_0_1.5px_var(--color-brand-200)]'
                    }`}
                  >
                    <span
                      className={`inline-flex h-[22px] w-[22px] items-center justify-center self-end rounded-full font-num text-[12px] ${
                        isToday || isSel
                          ? 'bg-brand-600 font-bold text-white'
                          : 'text-zinc-500'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {evs.slice(0, 2).map((e, idx) => (
                      <span
                        key={idx}
                        title={`${EVENT_META[e.type].label}:${e.comp.name}`}
                        className={`line-clamp-1 rounded-[7px] px-1.5 py-1 text-[10.5px] font-semibold leading-none ${EVENT_META[e.type].chip} ${
                          e.type === 'deadline' && (daysUntil(e.comp.registrationEnd) ?? 99) <= 3
                            ? '!bg-red-500 !font-bold !text-white'
                            : ''
                        }`}
                      >
                        {e.comp.name}
                      </span>
                    ))}
                    {evs.length > 2 && (
                      <span className="px-1 text-[10px] text-zinc-400">+{evs.length - 2} 项</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              {FILTERS.map((f) => (
                <span key={f.type} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded ${EVENT_META[f.type].dot}`} />
                  {f.label}
                </span>
              ))}
            </div>
          </Card>

          {/* 当日议程 + 未来截止 */}
          <Card className="flex flex-col p-5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-800">
              <CalendarBlank size={16} className="text-brand-600" />
              {selectedDayLabel}
            </p>
            <div className="mt-3 flex max-h-[380px] flex-col gap-1 overflow-y-auto">
              {dayEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-400">这一天没有安排</p>
              ) : (
                dayEvents.map((e, idx) => (
                  <EventRow
                    key={idx}
                    event={e}
                    favorited={favoriteIds.has(e.comp.id)}
                    onFavorite={() => toggleFavorite(e.comp)}
                  />
                ))
              )}
            </div>
            <div className="lane-line mt-3" />
            <p className="mt-3 mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-800">
              <Flag size={15} className="text-red-500" />
              未来 60 天截止
            </p>
            <div className="flex flex-col gap-1">
              {upcomingDeadlines.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">暂无临近截止的竞赛</p>
              ) : (
                upcomingDeadlines.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    to={`/competitions/${c.id}`}
                    className="group flex items-center gap-2.5 rounded-[10px] p-2 transition-colors hover:bg-canvas"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-red-50 text-red-500">
                      <span className="font-num text-base font-bold leading-none">
                        {daysUntil(c.registrationEnd)}
                      </span>
                      <span className="text-[9px]">天后</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-semibold text-zinc-700 group-hover:text-brand-700">
                        {c.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {fmtShort(c.registrationEnd)} 截止 · {FORMAT_META[c.format]}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {upcomingDeadlines.length > 0 && (
              <button
                onClick={() => setView('agenda')}
                className="mt-2 w-full rounded-[12px] border border-emerald-900/10 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                查看全部 →
              </button>
            )}
          </Card>
        </div>
      ) : (
        /* 议程视图:未来 90 天按月份分组 */
        <Card className="p-3 md:max-w-3xl">
          {agendaGroups.length === 0 ? (
            <p className="py-14 text-center text-sm text-zinc-400">未来 90 天没有符合筛选的安排</p>
          ) : (
            agendaGroups.map((g) => (
              <div key={g.label}>
                <p className="px-3 pb-1 pt-4 text-xs font-bold text-brand-700">{g.label}</p>
                {g.items.map((e, idx) => (
                  <EventRow
                    key={idx}
                    event={e}
                    favorited={favoriteIds.has(e.comp.id)}
                    onFavorite={() => toggleFavorite(e.comp)}
                    showDate
                  />
                ))}
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

/** 事件行:类型徽章 + 名称 + 元信息 + 收藏 */
function EventRow({
  event,
  favorited,
  onFavorite,
  showDate,
}: {
  event: CalEvent;
  favorited: boolean;
  onFavorite: () => void;
  showDate?: boolean;
}) {
  const { comp, type, date } = event;
  const meta = EVENT_META[type];
  const days = type === 'deadline' ? daysUntil(comp.registrationEnd) : null;
  return (
    <div className="flex items-center gap-3 rounded-[12px] p-2.5 transition-colors hover:bg-canvas">
      <span
        className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold ${meta.badge}`}
      >
        {meta.label}
      </span>
      <Link to={`/competitions/${comp.id}`} className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] font-semibold text-zinc-800 hover:text-brand-700">
          {comp.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400">
          {showDate && (
            <span className="font-num">
              {date.getMonth() + 1}月{date.getDate()}日
            </span>
          )}
          {!showDate && type === 'deadline' && days !== null && (
            <span
              className={`font-num font-bold ${days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : ''}`}
            >
              {deadlineCountdownText(days)}
            </span>
          )}
          <span>{LEVEL_META[comp.level].label}</span>
          <span>{FORMAT_META[comp.format]}</span>
        </p>
      </Link>
      <button
        onClick={onFavorite}
        title={favorited ? '取消收藏' : '收藏'}
        className={`rounded-[10px] border p-2 transition-colors ${
          favorited
            ? 'border-rose-200 bg-rose-50 text-rose-500'
            : 'border-emerald-900/10 text-zinc-300 hover:border-brand-300 hover:text-brand-600'
        }`}
      >
        <Heart size={15} weight={favorited ? 'fill' : 'regular'} />
      </button>
    </div>
  );
}

function deadlineCountdownText(days: number): string {
  if (days < 0) return `已截止 ${-days} 天`;
  if (days === 0) return '今天截止';
  return `还剩 ${days} 天`;
}
