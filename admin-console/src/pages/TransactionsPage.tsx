import { useCallback, useEffect, useState } from 'react';
import { fmtNum, fmtTime, request, SCENE_META, TX_TYPE_META } from '../lib/api';
import type { PageResponse, TokenTransaction, TxType } from '../lib/types';
import { Badge, Button, Card, Empty, Pagination, Select, Table, TextInput } from '../components/ui';

const PAGE_SIZE = 25;
const TYPES: TxType[] = ['RECHARGE', 'CARD', 'CONSUME', 'REFUND', 'GRANT', 'ADJUST'];
const SCENES = Object.keys(SCENE_META);

export default function TransactionsPage() {
  const [data, setData] = useState<PageResponse<TokenTransaction> | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ userId: '', type: '', scene: '', start: '', end: '' });
  const [applied, setApplied] = useState(filters);

  const load = useCallback(() => {
    request<PageResponse<TokenTransaction>>('/api/admin-api/billing/transactions', {
      params: {
        page: String(page),
        size: String(PAGE_SIZE),
        userId: applied.userId,
        type: applied.type,
        scene: applied.scene,
        start: applied.start,
        end: applied.end,
      },
    }).then(setData);
  }, [page, applied]);

  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Token 流水</h1>
        <p className="mt-1 text-sm text-zinc-400">全量收支明细，支持按用户 / 类型 / 场景 / 日期检索</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          value={filters.userId}
          onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          placeholder="用户 ID"
          className="w-28"
        />
        <Select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="w-32"
        >
          <option value="">全部类型</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TX_TYPE_META[t]?.label ?? t}
            </option>
          ))}
        </Select>
        <Select
          value={filters.scene}
          onChange={(e) => setFilters((f) => ({ ...f, scene: e.target.value }))}
          className="w-40"
        >
          <option value="">全部场景</option>
          {SCENES.map((s) => (
            <option key={s} value={s}>
              {SCENE_META[s]}
            </option>
          ))}
        </Select>
        <TextInput
          type="date"
          value={filters.start}
          onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
          className="w-40"
        />
        <span className="text-xs text-zinc-400">至</span>
        <TextInput
          type="date"
          value={filters.end}
          onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
          className="w-40"
        />
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
            const empty = { userId: '', type: '', scene: '', start: '', end: '' };
            setFilters(empty);
            setApplied(empty);
            setPage(0);
          }}
        >
          重置
        </Button>
      </div>

      <Card>
        <Table head={['ID', '用户', '类型', '场景', '数量', '交易后余额', '关联/备注', '时间']}>
          {(data?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={8}>
                <Empty text="没有符合条件的流水" />
              </td>
            </tr>
          )}
          {(data?.content ?? []).map((tx) => (
            <tr key={tx.id}>
              <td className="num px-4 py-2.5 text-xs text-zinc-400">{tx.id}</td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">#{tx.userId}</td>
              <td className="px-4 py-2.5">
                <Badge cls={TX_TYPE_META[tx.type]?.cls}>{TX_TYPE_META[tx.type]?.label ?? tx.type}</Badge>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">
                {tx.scene ? (SCENE_META[tx.scene] ?? tx.scene) : '-'}
              </td>
              <td className={`num px-4 py-2.5 font-semibold ${tx.amount >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
                {tx.amount >= 0 ? '+' : ''}
                {fmtNum(tx.amount)}
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">{fmtNum(tx.balanceAfter)}</td>
              <td className="max-w-56 truncate px-4 py-2.5 text-xs text-zinc-500">
                {tx.remark ?? tx.refId ?? '-'}
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-400">{fmtTime(tx.createdAt)}</td>
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
