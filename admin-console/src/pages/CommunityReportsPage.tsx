import { useEffect, useState, useCallback } from 'react';
import { Check, X, Flag, ChatCircleText } from '@phosphor-icons/react';
import { request, toast, fmtTime } from '../lib/api';

type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ReportReason = 'SPAM' | 'ABUSE' | 'FRAUD' | 'OTHER';

interface ForumReport {
  id: number;
  postId?: number | null;
  replyId?: number | null;
  reporterId: number;
  reason: ReportReason;
  detail?: string;
  status: ReportStatus;
  handlerId?: number | null;
  handledAt?: string | null;
  createdAt: string;
}

const REASON_META: Record<ReportReason, { label: string; cls: string }> = {
  SPAM: { label: '垃圾广告', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  ABUSE: { label: '辱骂攻击', cls: 'bg-red-50 text-red-700 ring-red-200' },
  FRAUD: { label: '欺诈不实', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  OTHER: { label: '其他', cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
};

const STATUS_META: Record<ReportStatus, { label: string; cls: string }> = {
  PENDING: { label: '待处理', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  APPROVED: { label: '已通过', cls: 'bg-red-50 text-red-700 ring-red-200' },
  REJECTED: { label: '已驳回', cls: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
};

const STATUS_FILTERS: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING', label: '待处理' },
  { value: 'APPROVED', label: '已通过' },
  { value: 'REJECTED', label: '已驳回' },
];

export default function CommunityReportsPage() {
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [filter, setFilter] = useState<ReportStatus>('PENDING');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    request<ForumReport[]>('/admin-api/forum/reports', { params: { status: filter } })
      .then((d) => setReports(d ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handle = async (id: number, decision: ReportStatus) => {
    try {
      await request(`/admin-api/forum/reports/${id}`, {
        method: 'PUT',
        body: { decision },
      });
      toast(decision === 'APPROVED' ? '已通过举报，内容已隐藏' : '已驳回举报', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">社区举报</h1>
          <p className="mt-1 text-sm text-zinc-500">审核用户举报的帖子与回复</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-[10px] bg-zinc-100 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                filter === f.value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-400">加载中…</p>
      ) : reports.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">暂无举报记录</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const reasonMeta = REASON_META[r.reason] ?? REASON_META.OTHER;
            const statusMeta = STATUS_META[r.status] ?? STATUS_META.PENDING;
            return (
              <div
                key={r.id}
                className="rounded-[12px] border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${reasonMeta.cls}`}>
                        <Flag size={11} /> {reasonMeta.label}
                      </span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        举报人 #{r.reporterId} · {fmtTime(r.createdAt)}
                      </span>
                    </div>

                    {/* 举报目标 */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                      {r.postId && (
                        <a
                          href={`/api/forum/posts/${r.postId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                        >
                          <ChatCircleText size={12} /> 帖子 #{r.postId}
                        </a>
                      )}
                      {r.replyId && (
                        <a
                          href={`/api/forum/posts/${r.postId ?? ''}#reply-${r.replyId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                        >
                          <ChatCircleText size={12} /> 回复 #{r.replyId}
                        </a>
                      )}
                    </div>

                    {/* 补充说明 */}
                    {r.detail && (
                      <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                        {r.detail}
                      </p>
                    )}

                    {r.handledAt && (
                      <p className="mt-1 text-[11px] text-zinc-400">
                        处理人 #{r.handlerId} · {fmtTime(r.handledAt)}
                      </p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  {r.status === 'PENDING' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handle(r.id, 'APPROVED')}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-100"
                      >
                        <Check size={14} weight="bold" /> 通过(隐藏内容)
                      </button>
                      <button
                        onClick={() => handle(r.id, 'REJECTED')}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-200"
                      >
                        <X size={14} weight="bold" /> 驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
