import { useCallback, useEffect, useState } from 'react';
import { ArrowUUpLeft, CheckCircle, DownloadSimple, XCircle } from '@phosphor-icons/react';
import {
  CHANNEL_META,
  download,
  fmtNum,
  fmtTime,
  fmtYuan,
  ORDER_STATUS_META,
  request,
  toast,
} from '../lib/api';
import type { OrderStatus, PageResponse, RechargeOrder } from '../lib/types';
import { Badge, Button, Card, Empty, Modal, Pagination, Table, Textarea } from '../components/ui';

const PAGE_SIZE = 20;
const TABS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'PENDING', label: '待确认' },
  { key: 'PAID', label: '已到账' },
  { key: 'CANCELLED', label: '已取消' },
  { key: 'REFUNDED', label: '已退款' },
];

export default function OrdersPage() {
  const [data, setData] = useState<PageResponse<RechargeOrder> | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [refunding, setRefunding] = useState<RechargeOrder | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    request<PageResponse<RechargeOrder>>('/api/admin-api/billing/orders', {
      params: { page: String(page), size: String(PAGE_SIZE), status },
    })
      .then(setData)
      .catch(() => setData(null));
  }, [page, status]);

  useEffect(load, [load]);

  const confirm = async (o: RechargeOrder) => {
    if (!window.confirm(`确认已收到「${o.orderNo}」的 ¥${fmtYuan(o.priceYuan)} 转账？确认后立即到账 ${o.tokens} 积分。`)) return;
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

  const doRefund = async () => {
    if (!refunding) return;
    setSubmitting(true);
    try {
      await request<void>(`/api/admin-api/billing/orders/${refunding.id}/refund`, {
        method: 'POST',
        body: { reason: reason || '管理员退款' },
      });
      toast(`已退款并冲正 ${fmtNum(refunding.tokens)} 积分`, 'success');
      setRefunding(null);
      setReason('');
      load();
    } catch (e) {
      // 余额已被消费时后端会拒绝并给出可操作的提示
      toast(e instanceof Error ? e.message : '退款失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = async () => {
    try {
      await download(
        '/api/admin-api/billing/export/orders.csv',
        { status },
        'recharge-orders.csv'
      );
      toast('导出已开始下载', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '导出失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">订单管理</h1>
          <p className="mt-1 text-sm text-zinc-400">
            人工收款模式：用户转账后，在这里点「确认收款」即自动到账；已到账订单可退款冲正
          </p>
        </div>
        <Button variant="ghost" onClick={exportCsv}>
          <DownloadSimple size={15} />
          导出 CSV
        </Button>
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
                <p className="num text-xs text-zinc-400">到账 {fmtNum(o.tokens)} 积分</p>
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
                {o.status === 'PENDING' && (
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
                )}
                {o.status === 'PAID' && (
                  <div className="flex items-center gap-2">
                    <Button variant="danger" size="sm" onClick={() => setRefunding(o)}>
                      <ArrowUUpLeft size={13} />
                      退款
                    </Button>
                    <span className="text-xs text-zinc-400">
                      {o.paidBy ?? '管理员'} · {fmtTime(o.paidAt)}
                    </span>
                  </div>
                )}
                {o.status === 'REFUNDED' && (
                  <span className="text-xs text-zinc-400">
                    {o.refundedBy ?? '管理员'} · {fmtTime(o.refundedAt)}
                    {o.refundReason ? ` · ${o.refundReason}` : ''}
                  </span>
                )}
                {o.status === 'CANCELLED' && <span className="text-xs text-zinc-400">-</span>}
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

      {refunding && (
        <Modal
          title={`订单退款 · ${refunding.orderNo}`}
          onClose={() => setRefunding(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRefunding(null)}>
                取消
              </Button>
              <Button variant="danger" onClick={doRefund} disabled={submitting}>
                {submitting ? '处理中…' : `确认退款并冲正 ${fmtNum(refunding.tokens)} 积分`}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-sm text-zinc-600">
            <p>
              用户 <span className="num font-medium text-zinc-800">#{refunding.userId}</span> 的订单
              <span className="num"> {refunding.orderNo}</span>（¥{fmtYuan(refunding.priceYuan)}，
              到账 {fmtNum(refunding.tokens)} 积分）将被冲正。
            </p>
            <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
              冲正会把已到账的积分从用户余额中扣回。若用户已经把积分消费掉（余额不足），
              后端会拒绝本次退款并提示差额，请先与用户协商或用「手动调整」处理。
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">退款原因</span>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：用户重复转账 / 协商退款"
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
