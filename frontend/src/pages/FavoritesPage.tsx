import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trophy } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import {
  FORMAT_META,
  JOURNEY_STATUS_META,
  JOURNEY_STATUS_OPTIONS,
} from '../lib/labels';
import type { JourneyStatus, MyCompetitionItem } from '../lib/types';
import { Card, CategoryBadge, EmptyState, LevelBadge, Skeleton, Stars } from '../components/ui';

export default function FavoritesPage() {
  const [list, setList] = useState<MyCompetitionItem[] | null>(null);
  const [filter, setFilter] = useState<JourneyStatus | ''>('');

  const load = () => {
    request<MyCompetitionItem[]>('/api/competitions/mine')
      .then((d) => setList(d ?? []))
      .catch(() => setList([]));
  };

  useEffect(load, []);

  const stats = useMemo(() => {
    const m: Record<JourneyStatus, number> = {
      WATCHING: 0,
      REGISTERED: 0,
      PREPARING: 0,
      COMPLETED: 0,
      AWARDED: 0,
    };
    list?.forEach((i) => {
      m[i.status] = (m[i.status] ?? 0) + 1;
    });
    return m;
  }, [list]);

  const filtered = useMemo(
    () => (filter ? (list ?? []).filter((i) => i.status === filter) : list ?? []),
    [list, filter]
  );

  const changeStatus = async (id: number, status: JourneyStatus) => {
    try {
      await request(`/api/competitions/${id}/status`, { method: 'PUT', body: { status } });
      toast(`已更新为「${JOURNEY_STATUS_META[status].label}」`, 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const remove = async (id: number) => {
    try {
      await request<boolean>(`/api/competitions/${id}/favorite`, { method: 'POST' });
      toast('已移除', 'info');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">我的竞赛</h1>
        <p className="mt-1 text-sm text-zinc-400">记录你与每场比赛的进度，从关注到获奖</p>
      </div>

      {/* 履历统计 */}
      {list && list.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {JOURNEY_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? '' : s)}
              className={`rounded-[var(--radius-card)] border px-3.5 py-3 text-left transition-colors ${
                filter === s
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                {s === 'AWARDED' && <Trophy size={13} className="text-amber-500" weight="fill" />}
                {JOURNEY_STATUS_META[s].label}
              </span>
              <span className="mt-1 block text-xl font-semibold text-zinc-800">{stats[s]}</span>
            </button>
          ))}
        </div>
      )}

      {list === null ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={list.length === 0 ? '还没有收藏比赛' : '该状态下暂无比赛'}
          description="在竞赛库或推荐列表里收藏比赛，在这里管理你的参赛进度。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ competition: c, status }) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={c.category} />
                  <LevelBadge level={c.level} />
                </div>
                <button
                  onClick={() => remove(c.id)}
                  title="移除"
                  className="rounded-md p-1.5 text-rose-400 transition-colors hover:bg-rose-50"
                >
                  <Heart size={17} weight="fill" />
                </button>
              </div>
              <Link
                to={`/competitions/${c.id}`}
                className="mt-2 line-clamp-1 text-[15px] font-semibold text-zinc-900 hover:text-brand-700"
              >
                {c.name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <Stars value={c.difficulty} label="难度" />
                <span>{FORMAT_META[c.format]}</span>
                {c.registrationEnd && <span>{c.registrationEnd} 截止</span>}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className={`rounded-md px-2 py-0.5 text-xs ${JOURNEY_STATUS_META[status].badge}`}>
                  {JOURNEY_STATUS_META[status].label}
                </span>
                <select
                  value={status}
                  onChange={(e) => changeStatus(c.id, e.target.value as JourneyStatus)}
                  title="更新参赛状态"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600"
                >
                  {JOURNEY_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {JOURNEY_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
