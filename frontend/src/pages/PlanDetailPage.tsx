import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Check,
  Clock,
  Flag,
  PencilSimple,
  Repeat,
  TrashSimple,
  Trophy,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { daysUntil, fmtShort } from '../lib/dates';
import type { PlanDetail, PreparationTask } from '../lib/types';
import { Button, Card, Pill, Skeleton, Spinner } from '../components/ui';
import GeneratePlanModal from '../components/GeneratePlanModal';

export default function PlanDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlanDetail | null>(null);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState<PreparationTask | null>(null);
  const [adjustText, setAdjustText] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(() => {
    request<PlanDetail>(`/api/preparation-plans/${id}`)
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, [id]);

  useEffect(load, [load]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!data) return <Skeleton className="h-96 w-full" />;

  const { plan, phases, progress } = data;
  const daysLeft = daysUntil(plan.targetDate);
  const totalHours = phases.reduce(
    (sum, p) => sum + p.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0),
    0
  );

  const toggle = async (taskId: number) => {
    try {
      await request(`/api/preparation-plans/${id}/tasks/${taskId}/toggle`, { method: 'PUT' });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const swap = async (taskId: number) => {
    try {
      await request(`/api/preparation-plans/${id}/tasks/${taskId}/swap`, { method: 'POST' });
      toast('已换一个新任务', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '换任务失败', 'error');
    }
  };

  const removeTask = async (taskId: number) => {
    if (!window.confirm('删除这个任务?')) return;
    try {
      await request(`/api/preparation-plans/${id}/tasks/${taskId}`, { method: 'DELETE' });
      toast('任务已删除', 'info');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const adjust = async () => {
    if (!adjustText.trim()) return;
    setAdjusting(true);
    try {
      const r = await request<{ keptDoneCount?: number }>(`/api/preparation-plans/${id}/adjust`, {
        method: 'POST',
        body: { instruction: adjustText.trim() },
      });
      setAdjustText('');
      toast(
        r.keptDoneCount ? `已按你的意见重排(${r.keptDoneCount} 个已打卡任务保留)` : '已按你的意见重排',
        'success'
      );
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '调整失败', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link to="/plans" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
        <ArrowLeft size={15} />
        返回备赛计划
      </Link>

      {/* 计划头部 */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={`/competitions/${plan.competitionId}`}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                {plan.competitionName}
              </Link>
              {plan.goal && <Pill tone="brand">目标:{plan.goal}</Pill>}
              {plan.weeklyHours != null && <Pill tone="neutral">每周 {plan.weeklyHours} 小时</Pill>}
            </div>
            <h1 className="mt-2.5 text-xl font-bold tracking-tight text-zinc-900">{plan.title}</h1>
            {plan.overview && (
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{plan.overview}</p>
            )}
            {plan.baseline && (
              <p className="mt-2 text-xs text-zinc-400">
                生成时已跳过:<span className="font-medium text-zinc-500">{plan.baseline}</span>
              </p>
            )}
          </div>
          {progress === 100 ? (
            <span className="flex shrink-0 flex-col items-center gap-1 rounded-[14px] bg-amber-50 px-4 py-3 text-amber-600 ring-1 ring-amber-200">
              <Trophy size={22} weight="fill" />
              <span className="text-xs font-bold">备赛完成</span>
            </span>
          ) : (
            daysLeft !== null && (
              <div className="flex shrink-0 flex-col items-center rounded-[14px] bg-brand-50 px-4 py-3 text-brand-700 ring-1 ring-brand-200">
                <span className="font-num text-2xl font-bold leading-none">
                  {Math.max(0, daysLeft)}
                </span>
                <span className="mt-1 text-[10px] font-semibold">
                  {daysLeft >= 0 ? '天后比赛' : '已过比赛日'}
                </span>
              </div>
            )
          )}
        </div>

        {/* 进度与时间轴摘要 */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400">
            <span>
              已完成 <b className="font-num font-bold text-brand-700">{plan.doneCount}</b> / {plan.taskCount} 个任务
            </span>
            <span>
              {plan.startDate && plan.endDate && (
                <>
                  <CalendarBlank size={12} className="mr-1 inline" />
                  {fmtShort(plan.startDate)} - {fmtShort(plan.endDate)}
                </>
              )}
              <span className="ml-3">
                总预估 <b className="font-num">{totalHours}</b> 小时
              </span>
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {progress === 100 && <div className="lane-line mt-4" />}
      </Card>

      {/* 阶段时间线 */}
      <div className="relative flex flex-col gap-4 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:border-l-2 before:border-dashed before:border-brand-300">
        {phases.map((phase, idx) => {
          const phaseDone = phase.doneCount === phase.totalCount && phase.totalCount > 0;
          return (
            <div key={idx} className="relative pl-10">
              {/* 节点旗 */}
              <span
                className={`absolute left-0 top-5 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white font-num text-xs font-bold ${
                  phaseDone ? 'border-brand-500 text-brand-600' : 'border-brand-300 text-zinc-400'
                }`}
              >
                {phaseDone ? <Flag size={14} weight="fill" /> : idx + 1}
              </span>

              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-bold text-zinc-900">{phase.title}</h3>
                  {phase.startDate && phase.endDate && (
                    <span className="rounded-full bg-canvas px-2.5 py-0.5 font-num text-[11px] text-zinc-500">
                      {fmtShort(phase.startDate)} - {fmtShort(phase.endDate)}
                    </span>
                  )}
                  <span className="ml-auto font-num text-xs text-zinc-400">
                    {phase.doneCount}/{phase.totalCount}
                  </span>
                </div>
                {phase.reason && (
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">「{phase.reason}」</p>
                )}

                <div className="mt-3 flex flex-col gap-1">
                  {phase.tasks.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-start gap-3 rounded-[10px] p-2.5 transition-colors hover:bg-canvas ${
                        t.done ? 'opacity-70' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggle(t.id)}
                        title={t.done ? '取消打卡' : '打卡完成'}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          t.done
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-zinc-300 text-transparent hover:border-brand-500'
                        }`}
                      >
                        <Check size={11} weight="bold" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${t.done ? 'text-zinc-400 line-through' : 'font-medium text-zinc-800'}`}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{t.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          {t.dueDate && (
                            <span
                              className={`rounded-full px-2 py-0.5 ring-1 ${
                                !t.done && daysUntil(t.dueDate) !== null && (daysUntil(t.dueDate) ?? 99) <= 3
                                  ? 'bg-red-50 font-bold text-red-500 ring-red-200'
                                  : 'bg-zinc-100 ring-zinc-200'
                              }`}
                            >
                              <CalendarBlank size={11} className="mr-1 inline" />
                              {fmtShort(t.dueDate)} 前
                            </span>
                          )}
                          {t.estimatedHours != null && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 ring-1 ring-zinc-200">
                              <Clock size={11} className="mr-1 inline" />
                              {t.estimatedHours} 小时
                            </span>
                          )}
                          {t.done && t.doneAt && (
                            <span className="font-num">✓ {t.doneAt?.replace('T', ' ').slice(0, 16)}</span>
                          )}
                        </div>
                      </div>
                      {/* 悬停操作 */}
                      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                        <button
                          onClick={() => swap(t.id)}
                          title="换一个任务"
                          className="rounded-[8px] p-1.5 text-zinc-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Repeat size={14} />
                        </button>
                        <button
                          onClick={() => setEditingTask(t)}
                          title="编辑任务"
                          className="rounded-[8px] p-1.5 text-zinc-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          onClick={() => removeTask(t.id)}
                          title="删除任务"
                          className="rounded-[8px] p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashSimple size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* 一句话重排 + 重新生成 */}
      <Card className="p-5">
        <p className="text-sm font-bold text-zinc-800">想让计划更合身?</p>
        <div className="mt-3 flex items-start gap-2">
          <input
            value={adjustText}
            onChange={(e) => setAdjustText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                adjust();
              }
            }}
            placeholder="例如:周四满课 / 侧重算法题 / 这周只投入 5 小时"
            className="flex-1 rounded-[12px] border border-emerald-900/10 bg-canvas px-3.5 py-2.5 text-sm placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white"
          />
          <Button onClick={adjust} disabled={adjusting || !adjustText.trim()}>
            {adjusting ? <Spinner className="border-white/40 border-t-white" /> : 'AI 重排'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">AI 只重排未完成任务,已打卡的保留不动</p>

        <div className="lane-line mt-4" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-zinc-400">对整份计划不满意?按新条件重新生成(会重置打卡)</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRegenerating(true)}>
              重新生成
            </Button>
            <Link to={`/competitions/${plan.competitionId}`}>
              <Button variant="ghost">
                返回竞赛
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 编辑任务弹窗 */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            load();
          }}
        />
      )}

      {/* 重新生成 */}
      {regenerating && (
        <GeneratePlanModal
          competitionId={plan.competitionId}
          competitionName={plan.competitionName}
          onClose={() => setRegenerating(false)}
          onGenerated={() => {
            setRegenerating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/** 编辑任务弹窗 */
function EditTaskModal({
  task,
  onClose,
  onSaved,
}: {
  task: PreparationTask;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { id } = useParams();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [hours, setHours] = useState(task.estimatedHours ?? 2);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await request(`/api/preparation-plans/${id}/tasks/${task.id}`, {
        method: 'PUT',
        body: {
          title: title.trim(),
          description,
          estimatedHours: hours,
          dueDate: dueDate || null,
        },
      });
      toast('任务已更新', 'success');
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/40" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col gap-4 rounded-[16px] bg-white p-6 shadow-2xl animate-rise">
        <h2 className="text-base font-bold text-zinc-900">编辑任务</h2>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">说明</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">预估小时</span>
            <input
              type="number"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">截止日期</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
