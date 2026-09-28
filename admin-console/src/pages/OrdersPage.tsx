import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle } from '@phosphor-icons/react';
import { CHANNEL_META, fmtNum, fmtTime, fmtYuan, ORDER_STATUS_META, request, toast } from '../lib/api';
import type { OrderStatus, PageResponse, RechargeOrder } from '../lib/types';
import { Badge, Button, Card, Empty, Pagination, Table } from '../components/ui';

const PAGE_SIZE = 20;
const TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待确认' },
  { key: 'PAID', label: '已到账' },
  { key: 'CANCELLED', label: '已取消' },
];

export default function OrdersPage() {
  const [data, setData] = useState<PageResponse<RechargeOrder> | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrderStatus | ''>('');

  const load = useCallback(() => {
    request<PageResponse<RechargeOrder>>('/api/admin-api/billing/orders', {
      params: { page: String(page), size: String(PAGE_SIZE), status },
    })
      .then(setData)
      .catch(() => setData(null));
  }, [page, status]);

  useEffect(load, [load]);

  const confirm = async (o: RechargeOrder) => {
    if (!window.confirm(`确认已收到「${o.orderNo}」的 ¥${fmtYuan(o.priceYuan)} 转账？确认后立即到账 ${o.tokens} Token。`)) return;
    try {
      await request<void>(`/api/admin-api/billing/orders/${o.id}/confirm`, { method: 'POST' });
      toast('已确认收款并到账', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  const cancel = async (o: RechargeOrder) => {
    if (!window.confirm(`确认取消订单「${o.orderNo}」？`)) return;
    try {
      await request<void>(`/api/admin-api/billing/orders/${o.id}/cancel`, { method: 'POST' });
      toast('订单已取消', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">订单管理</h1>
        <p className="mt-1 text-sm text-zinc-400">
          人工收款模式：用户转账后，在这里点「确认收款」即自动到账
        </p>
      </div>

      <div className="flex rounded-[10px] bg-zinc-100 p-0.5 self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setPage(0);
              setStatus(t.key as OrderStatus | '');
            }}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              status === t.key ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <Table head={['订单号', '用户', '套餐', '金额', '渠道', '状态', '创建时间', '操作']}>
          {(data?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={8}>
                <Empty text="暂无订单" />
              </td>
            </tr>
          )}
          {(data?.content ?? []).map((o) => (
            <tr key={o.id}>
              <td className="num px-4 py-3 text-xs text-zinc-500">{o.orderNo}</td>
              <td className="num px-4 py-3 text-xs text-zinc-500">#{o.userId}</td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-zinc-800">{o.packageName ?? '-'}</p>
                <p className="num text-xs text-zinc-400">到账 {fmtNum(o.tokens)} Token</p>
              </td>
              <td className="num px-4 py-3 font-semibold text-zinc-800">¥{fmtYuan(o.priceYuan)}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{CHANNEL_META[o.channel] ?? o.channel}</td>
              <td className="px-4 py-3">
                <Badge cls={ORDER_STATUS_META[o.status]?.cls}>
                  {ORDER_STATUS_META[o.status]?.label ?? o.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-400">{fmtTime(o.createdAt)}</td>
              <td className="px-4 py-3">
                {o.status === 'PENDING' ? (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" onClick={() => confirm(o)}>
                      <CheckCircle size={13} />
                      确认收款
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => cancel(o)}>
                      <XCircle size={13} />
                      取消
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">
                    {o.status === 'PAID' ? `已由 ${o.paidBy ?? '管理员'} 于 ${fmtTime(o.paidAt)} 确认` : '-'}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </Table>
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
