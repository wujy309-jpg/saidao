import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Flag, Lightning, Spinner } from '@phosphor-icons/react';
import { streamRequest, toast } from '../lib/api';
import { Button } from '../components/ui';

const GOALS = [
  { code: '冲奖', title: '冲奖', desc: '任务更深更密,对标国奖', icon: '🏁' },
  { code: '稳完赛', title: '稳完赛', desc: '节奏均衡,保质量完赛', icon: '🎯' },
  { code: '体验', title: '体验为主', desc: '轻量任务,重在参与', icon: '🌱' },
];

const COMPLETED_OPTIONS = ['组队完成', '选题确定', '基础复习完成', '真题已刷', '器材/资料备齐'];

/** 生成过程节点(与叙事步骤对应) */
const PROCESS_NODES = ['读取时间线', '倒排阶段', '分配强度', '优化细节'];

interface DonePayload {
  planId: number;
  title?: string;
  goal?: string;
  weeklyHours?: number;
  taskCount?: number;
  phaseCount?: number;
  startDate?: string;
  endDate?: string;
  baseline?: string;
}

export default function GeneratePlanModal({
  competitionId,
  competitionName,
  onClose,
  onGenerated,
}: {
  competitionId: number;
  competitionName: string;
  onClose: () => void;
  onGenerated: (planId: number) => void;
}) {
  const [goal, setGoal] = useState('稳完赛');
  const [hours, setHours] = useState(8);
  const [completed, setCompleted] = useState<string[]>([]);
  const [phase, setPhase] = useState<'form' | 'generating' | 'done'>('form');
  const [steps, setSteps] = useState<string[]>([]);
  const [donePayload, setDonePayload] = useState<DonePayload | null>(null);

  const toggleCompleted = (v: string) =>
    setCompleted((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  // 实时预估:默认 10 个任务 × 平均 2 小时
  const weeks = Math.max(1, Math.ceil((10 * 2) / hours));

  const start = async () => {
    setPhase('generating');
    setSteps([]);
    let gotDone = false;
    await streamRequest(
      '/api/preparation-plans/generate-stream',
      { competitionId, goal, weeklyHours: hours, completed },
      {
        onEvent: (event, data) => {
          if (event === 'step') {
            const d = data as { text: string };
            setSteps((prev) => [...prev, d.text]);
          } else if (event === 'done') {
            gotDone = true;
            setDonePayload(data as DonePayload);
            setPhase('done');
          } else if (event === 'error') {
            const d = data as { message?: string };
            toast(d?.message ?? '生成失败,请重试', 'error');
            setPhase('form');
          }
        },
        onError: (msg) => {
          toast(msg, 'error');
          setPhase('form');
        },
      }
    );
    if (!gotDone) return;
  };

  // 生成过程节点状态:已到达的叙事步骤数
  const activeNode = Math.min(PROCESS_NODES.length - 1, Math.max(0, steps.length - 1));

  const panel = (
    <>
      {/* 轻遮罩(背景页面保持可见) */}
      <div
        className="fixed inset-0 z-[60] bg-zinc-900/20 backdrop-blur-[1.5px]"
        onClick={onClose}
      />

      {/* 桌面:右侧抽屉 / 移动:底部弹层 */}
      <div className="fixed z-[61] inset-x-0 bottom-0 max-h-[92dvh] overflow-hidden rounded-t-[22px] bg-white shadow-2xl animate-slide-up-sheet md:inset-x-auto md:bottom-0 md:top-0 md:right-0 md:h-full md:max-h-none md:w-[480px] md:rounded-none md:animate-slide-in-right md:flex md:flex-col">
        <div className="flex h-full flex-col">
          {/* 头部 */}
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 md:px-6">
            <div className="min-w-0">
              <p className="font-num text-[11px] text-zinc-400">
                {phase === 'form' && (
                  <>
                    第 <b className="text-brand-700">1</b> / 2 步 · 约 30 秒
                  </>
                )}
                {phase === 'generating' && (
                  <>
                    第 <b className="text-brand-700">2</b> / 2 步 · 正在编排
                  </>
                )}
                {phase === 'done' && '完成'}
              </p>
              <h2 className="truncate text-[17px] font-extrabold text-zinc-900">生成备赛计划</h2>
            </div>
            <span className="ml-auto hidden max-w-[46%] truncate rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 sm:block">
              {competitionName}
            </span>
            <button
              onClick={onClose}
              className="h-8 w-8 shrink-0 rounded-[10px] border border-zinc-200 text-sm text-zinc-400 transition-colors hover:border-red-200 hover:text-red-500"
              title="关闭"
            >
              ✕
            </button>
          </div>

          {/* 主体 */}
          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            {phase === 'form' && (
              <div className="flex flex-col gap-6">
                {/* 目标 */}
                <div>
                  <p className="mb-2.5 text-sm font-bold text-zinc-800">参赛目标</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g.code}
                        onClick={() => setGoal(g.code)}
                        className={`relative rounded-[12px] border-[1.5px] p-3 text-left transition-all ${
                          goal === g.code
                            ? 'border-brand-500 bg-brand-50 shadow-[0_2px_10px_rgba(5,150,105,.12)]'
                            : 'border-zinc-200 bg-white hover:border-brand-300'
                        }`}
                      >
                        {goal === g.code && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">
                            ✓
                          </span>
                        )}
                        <span className="text-base">{g.icon}</span>
                        <span
                          className={`mt-1.5 block text-[13px] font-bold ${
                            goal === g.code ? 'text-brand-800' : 'text-zinc-800'
                          }`}
                        >
                          {g.title}
                        </span>
                        <span className="mt-1 block text-[10px] leading-snug text-zinc-400">{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 每周时长 */}
                <div>
                  <p className="mb-2.5 text-sm font-bold text-zinc-800">每周可投入时间</p>
                  <div className="flex items-center gap-4">
                    <div className="flex h-[52px] w-[76px] shrink-0 flex-col items-center justify-center rounded-[12px] border border-brand-200 bg-brand-50">
                      <span className="font-num text-xl font-bold leading-none text-brand-700">{hours}</span>
                      <span className="mt-1 text-[9.5px] text-brand-700">小时/周</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="range"
                        min={3}
                        max={20}
                        step={1}
                        value={hours}
                        onChange={(e) => setHours(Number(e.target.value))}
                        className="w-full accent-brand-600"
                      />
                      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                        <span>3h 轻松</span>
                        <span>20h 冲刺</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-zinc-200 bg-canvas px-4 py-2.5">
                    <span className="font-num text-lg font-bold text-brand-700">≈{weeks} 周</span>
                    <span className="text-[11px] leading-snug text-zinc-500">
                      完成全部训练 · 10 个任务 · 共约 20 小时
                    </span>
                  </div>
                </div>

                {/* 已完成盘点 */}
                <div>
                  <p className="mb-2.5 text-sm font-bold text-zinc-800">
                    已完成盘点 <span className="font-normal text-zinc-400">(选填,AI 会跳过这些)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMPLETED_OPTIONS.map((o) => (
                      <button
                        key={o}
                        onClick={() => toggleCompleted(o)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          completed.includes(o)
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'border border-zinc-200 bg-white text-zinc-500 hover:border-brand-300'
                        }`}
                      >
                        {completed.includes(o) && <Check size={12} className="mr-1 inline" weight="bold" />}
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {phase === 'generating' && (
              <div className="flex flex-col gap-5">
                {/* 迷你时间线 */}
                <div className="flex items-center rounded-[12px] border border-zinc-200 bg-canvas px-4 py-3.5">
                  {PROCESS_NODES.map((label, i) => (
                    <div key={label} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            i < activeNode
                              ? 'bg-brand-500'
                              : i === activeNode
                                ? 'bg-brand-500 animate-node-pulse'
                                : 'bg-zinc-300'
                          }`}
                        />
                        <span
                          className={`whitespace-nowrap text-[9.5px] ${
                            i <= activeNode ? 'font-bold text-brand-700' : 'text-zinc-400'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {i < PROCESS_NODES.length - 1 && (
                        <span
                          className={`mx-1 mb-4 h-0.5 flex-1 rounded-full ${
                            i < activeNode ? 'bg-brand-400' : 'bg-zinc-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* 叙事步骤 */}
                <div className="flex flex-col gap-2">
                  {steps.map((s, i) => {
                    const isLast = i === steps.length - 1;
                    return (
                      <p
                        key={i}
                        className={`flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-xs leading-relaxed ${
                          isLast ? 'border-brand-200 bg-white text-zinc-700' : 'border-transparent bg-canvas text-zinc-400'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                            isLast ? 'border-2 border-brand-500 bg-brand-100 text-brand-700' : 'bg-brand-600 text-white'
                          }`}
                        >
                          {isLast ? '' : '✓'}
                        </span>
                        {s}
                      </p>
                    );
                  })}
                  {steps.length < 4 && (
                    <p className="flex items-center gap-2 px-1 text-xs text-zinc-400">
                      <Spinner className="!h-3.5 !w-3.5" />
                      生成中…
                    </p>
                  )}
                </div>
                <p className="pb-1 text-center text-[11px] text-zinc-400">
                  预计还需 10-20 秒,AI 正在认真编排…
                </p>
              </div>
            )}

            {phase === 'done' && donePayload && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center py-2 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-brand-300 bg-brand-50 text-2xl">
                    🏁
                  </span>
                  <h3 className="mt-3 text-[17px] font-extrabold text-zinc-900">计划已就绪</h3>
                  <p className="mt-1 text-xs text-zinc-400">按比赛日期倒排完成,去看看你的备赛路线</p>
                </div>

                <div className="overflow-hidden rounded-[16px] border border-zinc-200">
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-50 text-sm text-brand-700">
                      ▦
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-zinc-800">
                        {donePayload.phaseCount ?? 4} 个阶段 · {donePayload.taskCount ?? 0} 个任务
                      </p>
                      <p className="text-[11px] text-zinc-400">每任务带建议截止日与预估时长</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-50 text-sm text-brand-700">
                      ◷
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-zinc-800">时间范围</p>
                      <p className="font-num text-[11px] text-zinc-400">
                        {donePayload.startDate?.slice(5) ?? '—'} 至 {donePayload.endDate?.slice(5) ?? '—'}
                        {donePayload.baseline ? ` · 已跳过:${donePayload.baseline}` : ''}
                      </p>
                    </div>
                    {donePayload.goal && (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                        {donePayload.goal}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-50 text-sm text-brand-700">
                      ⚡
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-zinc-800">{donePayload.title}</p>
                      <p className="text-[11px] text-zinc-400">每周 {donePayload.weeklyHours ?? 8} 小时 · 可在计划里一句话重排</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="flex gap-2.5 border-t border-zinc-100 px-5 py-4 md:px-6">
            {phase === 'form' && (
              <>
                <Button variant="ghost" onClick={onClose} className="!px-5">
                  取消
                </Button>
                <Button onClick={start} className="flex-1 !py-2.5">
                  <Lightning size={15} weight="fill" />
                  开始生成
                </Button>
              </>
            )}
            {phase === 'generating' && (
              <Button variant="ghost" onClick={onClose} className="flex-1">
                取消生成
              </Button>
            )}
            {phase === 'done' && donePayload && (
              <>
                <Button variant="ghost" onClick={onClose} className="!px-5">
                  留在本页
                </Button>
                <Button
                  onClick={() => onGenerated(donePayload.planId)}
                  className="flex-1 !py-2.5"
                >
                  查看计划
                  <Flag size={15} weight="fill" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
