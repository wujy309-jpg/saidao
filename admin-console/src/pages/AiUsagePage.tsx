import { useCallback, useEffect, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import {
  AI_STATUS_META,
  download,
  fmtNum,
  fmtTime,
  fmtYuan,
  request,
  SCENE_META,
  toast,
} from '../lib/api';
import type { AiCallLog, AiCallStatus, AiStats, PageResponse } from '../lib/types';
import { Badge, Button, Card, Empty, Pagination, Select, StatCard, Table, TextInput } from '../components/ui';

const PAGE_SIZE = 20;
const RANGES = [
  { days: 1, label: '今日' },
  { days: 7, label: '近 7 天' },
  { days: 30, label: '近 30 天' },
  { days: 90, label: '近 90 天' },
];

const pct = (v: number) => `${(Number(v ?? 0) * 100).toFixed(1)}%`;
const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${fmtNum(v)}ms`);

export default function AiUsagePage() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [logs, setLogs] = useState<PageResponse<AiCallLog> | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ scene: '', status: '', userId: '' });
  const [applied, setApplied] = useState(filters);

  const loadStats = useCallback(() => {
    request<AiStats>('/api/admin-api/billing/ai-stats', { params: { days: String(days) } })
      .then(setStats)
      .catch(() => setStats(null));
  }, [days]);

  const loadLogs = useCallback(() => {
    request<PageResponse<AiCallLog>>('/api/admin-api/billing/ai-logs', {
      params: {
        page: String(page),
        size: String(PAGE_SIZE),
        scene: applied.scene,
        status: applied.status,
        userId: applied.userId,
      },
    })
      .then(setLogs)
      .catch(() => setLogs(null));
  }, [page, applied]);

  useEffect(loadStats, [loadStats]);
  useEffect(loadLogs, [loadLogs]);

  const s = stats?.summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">AI 成本与可观测</h1>
          <p className="mt-1 text-sm text-zinc-400">
            场景 × 次数 × token × 成本：把「平台收了多少 Token」和「上游真实花了多少钱」对齐
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[10px] bg-zinc-100 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  days === r.days ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                await download('/api/admin-api/billing/export/ai-usage.csv', {}, 'ai-usage.csv');
                toast('导出已开始下载', 'success');
              } catch (e) {
                toast(e instanceof Error ? e.message : '导出失败', 'error');
              }
            }}
          >
            <DownloadSimple size={15} />
            导出明细
          </Button>
        </div>
      </div>

      {!s ? (
        <p className="py-16 text-center text-sm text-zinc-400">加载中…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="AI 请求数" value={fmtNum(s.calls)} sub={`上游调用 ${fmtNum(s.llmCalls)} 次`} />
            <StatCard
              label="成功率"
              value={pct(s.successRate)}
              accent={s.successRate >= 0.95 ? 'brand' : 'amber'}
              sub={`成功 ${fmtNum(s.success)} / 降级 ${fmtNum(s.degraded)} / 失败 ${fmtNum(s.failed)}`}
            />
            <StatCard
              label="降级率"
              value={pct(s.degradedRate)}
              accent={s.degradedRate > 0.05 ? 'red' : 'zinc'}
              sub="降级一律免扣，不计入收入"
            />
            <StatCard label="上游 token" value={fmtNum(s.totalTokens)} sub={`输入 ${fmtNum(s.promptTokens)} / 输出 ${fmtNum(s.completionTokens)}`} />
            <StatCard label="P95 延迟" value={ms(s.p95LatencyMs)} sub={`平均 ${ms(s.avgLatencyMs)}`} />
            <StatCard
              label="毛利"
              value={pct(s.grossMargin)}
              accent={s.grossMargin >= 0.6 ? 'brand' : 'amber'}
              sub={`收入 ¥${fmtYuan(s.revenueYuan)} − 成本 ¥${fmtYuan(s.estimatedCostYuan)}`}
            />
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-800">按场景核算</h2>
              <span className="text-xs text-zinc-400">
                成本按 ¥{s.inputPricePerMTok}/百万输入 token、¥{s.outputPricePerMTok}/百万输出 token 估算（可在平台设置调整）
              </span>
            </div>
            <Table
              head={['场景', '请求数', '成功', '降级', '失败', '输入 token', '输出 token', '平均 token/次', '估算成本', '实收 Token', '毛利', 'P95 延迟']}
            >
              {stats.scenes.length === 0 && (
                <tr>
                  <td colSpan={12}>
                    <Empty text="该时间段还没有 AI 调用记录" />
                  </td>
                </tr>
              )}
              {stats.scenes.map((row) => (
                <tr key={row.scene}>
                  <td className="px-4 py-2.5 font-medium text-zinc-700">
                    {row.label ?? SCENE_META[row.scene] ?? row.scene}
                  </td>
                  <td className="num px-4 py-2.5 text-zinc-600">{fmtNum(row.calls)}</td>
                  <td className="num px-4 py-2.5 text-brand-700">{fmtNum(row.success)}</td>
                  <td className={`num px-4 py-2.5 ${row.degraded > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
                    {fmtNum(row.degraded)}
                  </td>
                  <td className={`num px-4 py-2.5 ${row.failed > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                    {fmtNum(row.failed)}
                  </td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.promptTokens)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.completionTokens)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.avgTokensPerCall)}</td>
                  <td className="num px-4 py-2.5 text-zinc-600">¥{fmtYuan(row.estimatedCostYuan)}</td>
                  <td className="num px-4 py-2.5 text-zinc-600">{fmtNum(row.chargedTokens)}</td>
                  <td className={`num px-4 py-2.5 font-medium ${row.grossProfitYuan >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                    {pct(row.grossMargin)}
                  </td>
                  <td className="num px-4 py-2.5 text-zinc-500">{ms(row.p95LatencyMs)}</td>
                </tr>
              ))}
            </Table>
          </Card>

          {stats.trend.length > 0 && (
            <Card>
              <div className="border-b border-zinc-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-800">日趋势</h2>
              </div>
              <Table head={['日期', '请求数', '上游 token', '估算成本', '实收 Token']}>
                {stats.trend.map((d) => (
                  <tr key={d.date}>
                    <td className="num px-4 py-2.5 text-zinc-600">{d.date}</td>
                    <td className="num px-4 py-2.5 text-zinc-600">{fmtNum(d.calls)}</td>
                    <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(d.totalTokens)}</td>
                    <td className="num px-4 py-2.5 text-zinc-600">¥{fmtYuan(d.estimatedCostYuan)}</td>
                    <td className="num px-4 py-2.5 text-zinc-600">{fmtNum(d.chargedTokens)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">调用明细</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <TextInput
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              placeholder="用户 ID"
              className="w-24"
            />
            <Select
              value={filters.scene}
              onChange={(e) => setFilters((f) => ({ ...f, scene: e.target.value }))}
              className="w-40"
            >
              <option value="">全部场景</option>
              {Object.entries(SCENE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-32"
            >
              <option value="">全部状态</option>
              <option value="SUCCESS">成功</option>
              <option value="DEGRADED">降级免扣</option>
              <option value="FAILED">失败免扣</option>
            </Select>
            <Button
              onClick={() => {
                setPage(0);
                setApplied(filters);
              }}
            >
              查询
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const empty = { scene: '', status: '', userId: '' };
                setFilters(empty);
                setApplied(empty);
                setPage(0);
              }}
            >
              重置
            </Button>
          </div>
        </div>
        <Table head={['时间', 'refId', '用户', '场景', '状态', 'token(入/出)', '耗时', '成本', '实收', '上游模型', '原因']}>
          {(logs?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={11}>
                <Empty text="暂无调用记录" />
              </td>
            </tr>
          )}
          {(logs?.content ?? []).map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2.5 text-xs text-zinc-400">{fmtTime(l.createdAt)}</td>
              <td className="num max-w-36 truncate px-4 py-2.5 text-[11px] text-zinc-400" title={l.refId}>
                {l.refId}
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">#{l.userId}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-600">{SCENE_META[l.scene] ?? l.scene}</td>
              <td className="px-4 py-2.5">
                <Badge cls={AI_STATUS_META[l.status]?.cls}>{AI_STATUS_META[l.status]?.label ?? l.status}</Badge>
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">
                {fmtNum(l.promptTokens)} / {fmtNum(l.completionTokens)}
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">{ms(l.latencyMs)}</td>
              <td className="num px-4 py-2.5 text-xs text-zinc-600">¥{fmtYuan(l.estimatedCostYuan)}</td>
              <td className={`num px-4 py-2.5 text-xs font-medium ${l.chargedTokens > 0 ? 'text-zinc-700' : 'text-zinc-400'}`}>
                {fmtNum(l.chargedTokens)}
              </td>
              <td className="px-4 py-2.5 text-[11px] text-zinc-400">{l.model ?? '-'}</td>
              <td className="max-w-40 truncate px-4 py-2.5 text-[11px] text-zinc-400" title={l.errorType}>
                {l.errorType ?? '-'}
              </td>
            </tr>
          ))}
        </Table>
        {logs && (
          <Pagination
            page={logs.page}
            totalPages={logs.totalPages}
            totalElements={logs.totalElements}
            onChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
