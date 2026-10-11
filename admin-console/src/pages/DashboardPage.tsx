import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warning } from '@phosphor-icons/react';
import { request, fmtNum, fmtYuan, fmtTime, ORDER_STATUS_META, CHANNEL_META, SCENE_META } from '../lib/api';
import type { OverviewData } from '../lib/types';
import { Badge, Card, Empty, StatCard, Table } from '../components/ui';

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    request<OverviewData>('/api/admin-api/billing/overview')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, []);

  if (error) return <Empty text={error} />;
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-400">加载中…</div>
    );
  }

  const t = data.today;
  const a = data.total;
  const alert = data.pendingAlert;
  const ai = data.aiStatsToday;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">总览</h1>
        <p className="mt-1 text-sm text-zinc-400">营收、积分消耗与 AI 调用情况</p>
      </div>

      {/* 待确认订单超时提醒 */}
      {alert && alert.overdueCount > 0 && (
        <button
          onClick={() => navigate('/orders')}
          className="flex items-start gap-3 rounded-[var(--radius-card)] bg-amber-50 px-4 py-3 text-left ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
        >
          <Warning size={18} className="mt-0.5 shrink-0 text-amber-600" weight="fill" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              有 {alert.overdueCount} 笔订单超过 {alert.thresholdHours} 小时仍未确认收款
            </p>
            <p className="num mt-0.5 truncate text-xs text-amber-700">
              最早：{alert.orders[0]?.orderNo}（用户 #{alert.orders[0]?.userId}，
              ¥{fmtYuan(alert.orders[0]?.priceYuan)}，{fmtTime(alert.orders[0]?.createdAt)}）—— 点击处理
            </p>
          </div>
        </button>
      )}

      {/* 今日 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="今日营收（元）" value={`¥${fmtYuan(t.rechargeAmount)}`} accent="brand" sub={`${t.rechargeCount} 笔到账`} />
        <StatCard
          label="今日到账积分"
          value={fmtNum(t.rechargedTokens)}
          sub={`净消耗 ${fmtNum(t.consumedTokens)}${t.refundedTokens > 0 ? ` · 退回 ${fmtNum(t.refundedTokens)}` : ''}`}
        />
        <StatCard
          label="今日 AI 调用"
          value={fmtNum(t.aiCalls)}
          sub={`估算成本 ¥${fmtYuan(t.aiCostYuan)}`}
          onClick={() => navigate('/ai-usage')}
        />
        <StatCard
          label="今日活跃用户"
          value={fmtNum(t.loginUsers)}
          accent="brand"
          sub={`近 7 天 ${fmtNum(a.loginUsers7d)} 人 · 按登录去重`}
        />
        <StatCard label="今日 AI 活跃用户" value={fmtNum(t.activeUsers)} sub="有扣费/免费调用的用户" />
        <StatCard
          label="待确认订单"
          value={fmtNum(t.pendingOrders)}
          accent={t.pendingOrders > 0 ? 'amber' : 'zinc'}
          sub="点击前往处理"
          onClick={() => navigate('/orders')}
        />
        <StatCard label="累计营收（元）" value={`¥${fmtYuan(a.rechargeAmount)}`} accent="brand" sub={`${a.paidUsers} 位付费用户`} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="注册用户" value={fmtNum(a.registeredUsers)} sub={`累计赠送 ${fmtNum(a.grantedTokens)} 积分`} />
        <StatCard
          label="累计净消耗积分"
          value={fmtNum(a.consumedTokens)}
          sub="只统计已结算的 AI 预留，退款不漂移"
        />
        <StatCard
          label="累计退款（元）"
          value={`¥${fmtYuan(a.refundedAmount)}`}
          accent={Number(a.refundedAmount) > 0 ? 'red' : 'zinc'}
          sub={`冲正积分 ${fmtNum(a.refundedTokens)}`}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          label="今日降级率"
          value={ai ? `${(Number(ai.degradedRate) * 100).toFixed(1)}%` : '-'}
          accent={ai && Number(ai.degradedRate) > 0.05 ? 'red' : 'zinc'}
          sub={ai ? `成功 ${(Number(ai.successRate) * 100).toFixed(1)}% · 降级一律免扣` : '暂无 AI 调用'}
          onClick={() => navigate('/ai-usage')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 场景消耗 */}
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-800">AI 场景消耗</h2>
            <button
              onClick={() => navigate('/ai-usage')}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              成本面板 →
            </button>
          </div>
          <Table head={['场景', '今日次数', '今日已结算', '累计次数', '累计已结算', '累计退回']}>
            {data.sceneStatsTotal.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <Empty text="暂无 AI 调用" />
                </td>
              </tr>
            )}
            {data.sceneStatsTotal.map((row) => {
              const today = data.sceneStatsToday.find((s) => s.scene === row.scene);
              return (
                <tr key={row.scene}>
                  <td className="px-4 py-2.5 font-medium text-zinc-700">
                    {SCENE_META[row.scene] ?? row.scene}
                  </td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(today?.count ?? 0)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(today?.settledCount ?? 0)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.count)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.settledCount)}</td>
                  <td className={`num px-4 py-2.5 ${row.releasedCount > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
                    {fmtNum(row.releasedCount)}
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>

        {/* 最近订单 */}
        <Card>
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-800">最近订单</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              全部订单 →
            </button>
          </div>
          <Table head={['订单号', '套餐', '金额', '状态', '时间']}>
            {data.recentOrders.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <Empty text="暂无订单" />
                </td>
              </tr>
            )}
            {data.recentOrders.map((o) => (
              <tr key={o.id}>
                <td className="num px-4 py-2.5 text-xs text-zinc-500">{o.orderNo}</td>
                <td className="px-4 py-2.5 text-zinc-700">{o.packageName ?? '-'}</td>
                <td className="num px-4 py-2.5 font-medium text-zinc-800">¥{fmtYuan(o.priceYuan)}</td>
                <td className="px-4 py-2.5">
                  <Badge cls={ORDER_STATUS_META[o.status]?.cls}>{ORDER_STATUS_META[o.status]?.label ?? o.status}</Badge>
                  <span className="ml-1.5 text-xs text-zinc-400">{CHANNEL_META[o.channel]}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-400">{fmtTime(o.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  );
}
