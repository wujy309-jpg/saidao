import { useCallback, useEffect, useState } from 'react';
import { DownloadSimple, Ticket } from '@phosphor-icons/react';
import { fmtNum, fmtTime, getToken, request, toast } from '../lib/api';
import type { CardKey, PageResponse, TokenPackage } from '../lib/types';
import { Badge, Button, Card, Empty, Field, Modal, Pagination, Select, Table, TextInput, Textarea } from '../components/ui';

const PAGE_SIZE = 25;

export default function CardsPage() {
  const [data, setData] = useState<PageResponse<CardKey> | null>(null);
  const [page, setPage] = useState(0);
  const [batchNo, setBatchNo] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ batchNo: '', status: '' });
  const [generating, setGenerating] = useState(false);
  const [packages, setPackages] = useState<TokenPackage[]>([]);

  const load = useCallback(() => {
    request<PageResponse<CardKey>>('/api/admin-api/billing/cards', {
      params: { page: String(page), size: String(PAGE_SIZE), batchNo: applied.batchNo, status: applied.status },
    })
      .then(setData)
      .catch(() => setData(null));
  }, [page, applied]);

  useEffect(load, [load]);

  useEffect(() => {
    request<TokenPackage[]>('/api/admin-api/billing/packages')
      .then((d) => setPackages(d ?? []))
      .catch(() => setPackages([]));
  }, []);

  const exportBatch = async (batch: string) => {
    try {
      const resp = await fetch(`/api/admin-api/billing/cards/export?batchNo=${encodeURIComponent(batch)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!resp.ok) {
        const p = await resp.json().catch(() => null);
        throw new Error(p?.message ?? '导出失败');
      }
      const text = await resp.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cards-${batch}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast('已导出', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '导出失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">卡密管理</h1>
          <p className="mt-1 text-sm text-zinc-400">批量生成兑换码用于售卖/地推，用户在主站充值中心兑换</p>
        </div>
        <Button onClick={() => setGenerating(true)}>
          <Ticket size={15} />
          批量生成卡密
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <TextInput
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          placeholder="批次号（C 开头）"
          className="w-56"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
          <option value="">全部状态</option>
          <option value="UNUSED">未使用</option>
          <option value="USED">已使用</option>
        </Select>
        <Button
          onClick={() => {
            setPage(0);
            setApplied({ batchNo: batchNo.trim(), status });
          }}
        >
          查询
        </Button>
      </div>

      <Card>
        <Table head={['卡密', '批次', '套餐', 'Token', '状态', '使用人/时间', '操作']}>
          {(data?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={7}>
                <Empty text="暂无卡密" />
              </td>
            </tr>
          )}
          {(data?.content ?? []).map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2.5">
                <span className="num rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs tracking-wider text-zinc-700">
                  {c.code}
                </span>
              </td>
              <td className="num px-4 py-2.5 text-xs text-zinc-500">{c.batchNo}</td>
              <td className="px-4 py-2.5 text-xs text-zinc-600">{c.packageName ?? '-'}</td>
              <td className="num px-4 py-2.5 text-brand-700">{fmtNum(c.tokens)}</td>
              <td className="px-4 py-2.5">
                <Badge cls={c.status === 'UNUSED' ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-zinc-100 text-zinc-500 ring-zinc-200'}>
                  {c.status === 'UNUSED' ? '未使用' : '已使用'}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-xs text-zinc-500">
                {c.usedByUserId ? `用户 #${c.usedByUserId} · ${fmtTime(c.usedAt)}` : '-'}
              </td>
              <td className="px-4 py-2.5">
                <button
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  onClick={() => exportBatch(c.batchNo)}
                >
                  <DownloadSimple size={13} />
                  导出批次
                </button>
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

      {generating && (
        <GenerateModal packages={packages} onClose={() => setGenerating(false)} onDone={load} />
      )}
    </div>
  );
}

function GenerateModal({
  packages,
  onClose,
  onDone,
}: {
  packages: TokenPackage[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [packageId, setPackageId] = useState('');
  const [count, setCount] = useState('10');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const enabled = packages.filter((p) => p.enabled);
  const selected = enabled.find((p) => String(p.id) === packageId);

  const submit = async () => {
    const n = Number(count);
    if (!packageId || !Number.isInteger(n) || n < 1 || n > 500) {
      toast('请选择套餐并填写 1-500 的数量', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await request<{ batchNo: string }>('/api/admin-api/billing/cards/generate', {
        method: 'POST',
        body: { packageId: Number(packageId), count: n, remark: remark.trim() },
      });
      setResult(r.batchNo);
      toast(`已生成 ${n} 张卡密`, 'success');
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : '生成失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="批量生成卡密"
      onClose={onClose}
      footer={
        result ? (
          <Button variant="ghost" onClick={onClose}>
            完成
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? '生成中…' : '生成'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Ticket size={26} />
          </div>
          <p className="text-sm text-zinc-600">生成成功，批次号：</p>
          <p className="num rounded-lg bg-zinc-100 px-4 py-2 font-mono text-lg font-semibold text-zinc-800">
            {result}
          </p>
          <p className="text-center text-xs text-zinc-400">
            可在列表中按批次号查询并导出 TXT 发放给买家
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="选择套餐（决定每张卡密的到账 Token）">
            <Select value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">请选择套餐</option>
              {enabled.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（¥{p.priceYuan} · 到账 {p.tokens + p.bonusTokens} Token）
                </option>
              ))}
            </Select>
          </Field>
          <Field label="生成数量（1-500）">
            <TextInput type="number" value={count} onChange={(e) => setCount(e.target.value)} />
          </Field>
          <Field label="备注（可选，便于区分渠道）">
            <Textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="如：9月地推活动"
            />
          </Field>
          {selected && (
            <p className="rounded-[10px] bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              本批次每张卡密到账 <span className="font-semibold text-brand-700">{selected.tokens + selected.bonusTokens}</span> Token
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
