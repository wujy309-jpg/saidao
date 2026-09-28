import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">总览</h1>
        <p className="mt-1 text-sm text-zinc-400">营收、Token 消耗与 AI 调用情况</p>
      </div>

      {/* 今日 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="今日营收（元）" value={`¥${fmtYuan(t.rechargeAmount)}`} accent="brand" sub={`${t.rechargeCount} 笔到账`} />
        <StatCard label="今日到账 Token" value={fmtNum(t.rechargedTokens)} sub={`消耗 ${fmtNum(t.consumedTokens)}`} />
        <StatCard label="今日 AI 活跃用户" value={fmtNum(t.activeUsers)} sub="有扣费/免费调用的用户" />
        <StatCard
          label="待确认订单"
          value={fmtNum(t.pendingOrders)}
          accent={t.pendingOrders > 0 ? 'amber' : 'zinc'}
          sub="点击前往处理"
          onClick={() => navigate('/orders')}
        />
        <StatCard label="累计营收（元）" value={`¥${fmtYuan(a.rechargeAmount)}`} accent="brand" sub={`${a.paidUsers} 位付费用户`} />
        <StatCard label="注册用户" value={fmtNum(a.registeredUsers)} sub={`累计赠送 ${fmtNum(a.grantedTokens)} Token`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 场景消耗 */}
        <Card>
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-800">AI 场景消耗</h2>
          </div>
          <Table head={['场景', '今日次数', '今日 Token', '累计次数', '累计 Token']}>
            {data.sceneStatsTotal.length === 0 && (
              <tr>
                <td colSpan={5}>
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
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(today?.tokens ?? 0)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.count)}</td>
                  <td className="num px-4 py-2.5 text-zinc-500">{fmtNum(row.tokens)}</td>
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
