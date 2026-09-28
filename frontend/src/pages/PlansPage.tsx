import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, CalendarCheck, TrashSimple, Trophy } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { daysUntil, fmtShort } from '../lib/dates';
import type { PreparationPlan } from '../lib/types';
import { Card, EmptyState, Pill, Skeleton } from '../components/ui';

export default function PlansPage() {
  const [plans, setPlans] = useState<PreparationPlan[] | null>(null);

  const load = () => {
    request<PreparationPlan[]>('/api/preparation-plans/mine')
      .then((d) => setPlans(d ?? []))
      .catch(() => setPlans([]));
  };

  useEffect(load, []);

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`删除「${name}」的备赛计划？`)) return;
    try {
      await request(`/api/preparation-plans/${id}`, { method: 'DELETE' });
      toast('计划已删除', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">备赛计划</h1>
        <p className="mt-1 text-sm text-zinc-400">
          在竞赛详情页点击「生成备赛计划」，AI 为你定制阶段化训练清单
        </p>
      </div>

      {plans === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          title="还没有备赛计划"
          description="去竞赛库挑一场想打的比赛，在详情页生成你的专属备赛计划。"
          action={
            <Link
              to="/competitions"
              className="rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              去竞赛库看看
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((p) => {
            const percent = p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * 100) : 0;
            const days = daysUntil(p.targetDate);
            return (
              <Link key={p.id} to={`/plans/${p.id}`}>
                <Card className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
                    <CalendarCheck size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-zinc-900">{p.title}</h3>
                      {p.goal && <Pill tone="brand">{p.goal}</Pill>}
                      {percent === 100 && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-600">
                          <Trophy size={11} weight="fill" />
                          已完成
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                      <span className="truncate">{p.competitionName}</span>
                      {p.startDate && p.endDate && (
                        <span className="inline-flex items-center gap-1 font-num">
                          <CalendarBlank size={11} />
                          {fmtShort(p.startDate)} - {fmtShort(p.endDate)}
                        </span>
                      )}
                      {p.weeklyHours != null && <span>每周 {p.weeklyHours}h</span>}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-num text-xs font-semibold text-zinc-500">
                        {p.doneCount}/{p.taskCount} · {percent}%
                      </span>
                    </div>
                  </div>
                  {days !== null && percent < 100 && (
                    <span
                      className={`hidden shrink-0 rounded-full px-3 py-1.5 font-num text-xs font-bold sm:block ${
                        days <= 14 ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-700'
                      }`}
                    >
                      {days >= 0 ? `${days} 天后比赛` : '已过比赛日'}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      remove(p.id, p.title);
                    }}
                    title="删除计划"
                    className="shrink-0 rounded-md p-2 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <TrashSimple size={16} />
                  </button>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
