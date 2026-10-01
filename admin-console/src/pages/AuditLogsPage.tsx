import { useCallback, useEffect, useState } from 'react';
import { AUDIT_ACTION_META, fmtTime, request } from '../lib/api';
import type { AuditLog, PageResponse } from '../lib/types';
import { Badge, Button, Card, Empty, Pagination, Select, Table, TextInput } from '../components/ui';

const PAGE_SIZE = 25;

const ACTIONS = [
  'BILLING_ADJUST',
  'BILLING_ORDER_CONFIRM',
  'BILLING_ORDER_CANCEL',
  'BILLING_ORDER_REFUND',
  'BILLING_SCENE_UPDATE',
  'BILLING_SETTINGS_UPDATE',
  'BILLING_PACKAGE_CREATE',
  'BILLING_PACKAGE_UPDATE',
  'BILLING_PACKAGE_DELETE',
  'BILLING_CARD_GENERATE',
  'BILLING_CARD_EXPORT',
];

export default function AuditLogsPage() {
  const [data, setData] = useState<PageResponse<AuditLog> | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ action: '', username: '', start: '', end: '' });
  const [applied, setApplied] = useState(filters);

  const load = useCallback(() => {
    request<PageResponse<AuditLog>>('/api/admin-api/billing/audit-logs', {
      params: {
        page: String(page),
        size: String(PAGE_SIZE),
        action: applied.action,
        username: applied.username,
        start: applied.start,
        end: applied.end,
      },
    })
      .then(setData)
      .catch(() => setData(null));
  }, [page, applied]);

  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">资金操作审计</h1>
        <p className="mt-1 text-sm text-zinc-400">
          加币、扣币、改价、确认收款、退款、生成与导出卡密、修改平台设置 —— 全部留痕可追溯
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          className="w-44"
        >
          <option value="">全部操作</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {AUDIT_ACTION_META[a] ?? a}
            </option>
          ))}
        </Select>
        <TextInput
          value={filters.username}
          onChange={(e) => setFilters((f) => ({ ...f, username: e.target.value }))}
          placeholder="操作人账号"
          className="w-36"
        />
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
            const empty = { action: '', username: '', start: '', end: '' };
            setFilters(empty);
            setApplied(empty);
            setPage(0);
          }}
        >
          重置
        </Button>
      </div>

      <Card>
        <Table head={['时间', '操作人', '操作', '对象', '详情', '结果', 'IP']}>
          {(data?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={7}>
                <Empty text="没有符合条件的审计记录" />
              </td>
            </tr>
          )}
          {(data?.content ?? []).map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2.5 text-xs text-zinc-400">{fmtTime(log.createdAt)}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-600">
                {log.username}
                <span className="num ml-1 text-zinc-400">#{log.userId}</span>
              </td>
              <td className="px-4 py-2.5 text-xs font-medium text-zinc-700">
                {AUDIT_ACTION_META[log.action] ?? log.action}
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">
                {log.resourceType ?? '-'}
                {log.resourceId != null ? ` #${log.resourceId}` : ''}
              </td>
              <td className="max-w-96 px-4 py-2.5 text-xs text-zinc-500">{log.details ?? '-'}</td>
              <td className="px-4 py-2.5">
                <Badge
                  cls={
                    log.success
                      ? 'bg-brand-50 text-brand-700 ring-brand-200'
                      : 'bg-red-50 text-red-600 ring-red-200'
                  }
                >
                  {log.success ? '成功' : '失败'}
                </Badge>
                {!log.success && log.errorMessage && (
                  <p className="mt-1 max-w-56 text-[11px] text-red-500">{log.errorMessage}</p>
                )}
              </td>
              <td className="num px-4 py-2.5 text-[11px] text-zinc-400">{log.ipAddress ?? '-'}</td>
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
