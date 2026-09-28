import { useCallback, useEffect, useState } from 'react';
import { PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react';
import { fmtNum, fmtYuan, request, toast } from '../lib/api';
import type { TokenPackage } from '../lib/types';
import { Badge, Button, Card, Empty, Field, Modal, Table, TextInput, Toggle } from '../components/ui';

export default function PackagesPage() {
  const [list, setList] = useState<TokenPackage[] | null>(null);
  const [editing, setEditing] = useState<TokenPackage | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    request<TokenPackage[]>('/api/admin-api/billing/packages')
      .then((d) => setList(d ?? []))
      .catch(() => setList([]));
  }, []);

  useEffect(load, [load]);

  const remove = async (p: TokenPackage) => {
    if (!window.confirm(`确认删除套餐「${p.name}」？（不影响已产生订单）`)) return;
    try {
      await request<void>(`/api/admin-api/billing/packages/${p.id}`, { method: 'DELETE' });
      toast('套餐已删除', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  const toggleEnabled = async (p: TokenPackage) => {
    try {
      await request<TokenPackage>(`/api/admin-api/billing/packages/${p.id}`, {
        method: 'PUT',
        body: { ...p, enabled: !p.enabled },
      });
      toast(p.enabled ? '套餐已下架' : '套餐已上架', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">充值套餐</h1>
          <p className="mt-1 text-sm text-zinc-400">用户购买入口展示的套餐，可上下架与调整价格</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          <Plus size={15} />
          新增套餐
        </Button>
      </div>

      <Card>
        <Table head={['排序', '套餐', '售价', '基础 Token', '赠送', '到账合计', '状态', '操作']}>
          {(list ?? []).length === 0 && (
            <tr>
              <td colSpan={8}>
                <Empty text="暂无套餐，点击右上角新增" />
              </td>
            </tr>
          )}
          {(list ?? []).map((p) => (
            <tr key={p.id}>
              <td className="num px-4 py-3 text-xs text-zinc-400">{p.sortOrder}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-zinc-800">{p.name}</p>
                {p.description && <p className="text-xs text-zinc-400">{p.description}</p>}
              </td>
              <td className="num px-4 py-3 font-semibold text-zinc-800">¥{fmtYuan(p.priceYuan)}</td>
              <td className="num px-4 py-3 text-zinc-600">{fmtNum(p.tokens)}</td>
              <td className="num px-4 py-3 text-brand-700">+{fmtNum(p.bonusTokens)}</td>
              <td className="num px-4 py-3 font-semibold text-brand-700">{fmtNum(p.tokens + p.bonusTokens)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge cls={p.enabled ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-zinc-100 text-zinc-500 ring-zinc-200'}>
                    {p.enabled ? '在售' : '已下架'}
                  </Badge>
                  <Toggle checked={p.enabled} onChange={() => toggleEnabled(p)} label="上下架" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    title="编辑"
                    onClick={() => {
                      setCreating(false);
                      setEditing(p);
                    }}
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="删除"
                    onClick={() => remove(p)}
                  >
                    <TrashSimple size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {(creating || editing) && (
        <PackageForm
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}

function PackageForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: TokenPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    priceYuan: initial ? String(initial.priceYuan) : '',
    tokens: initial ? String(initial.tokens) : '',
    bonusTokens: initial ? String(initial.bonusTokens) : '0',
    sortOrder: initial ? String(initial.sortOrder) : '10',
    enabled: initial?.enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim() || !Number(form.priceYuan) || !Number(form.tokens)) {
      setError('请填写套餐名称、售价与基础 Token');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      priceYuan: Number(form.priceYuan),
      tokens: Number(form.tokens),
      bonusTokens: Number(form.bonusTokens),
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (initial) {
        await request<TokenPackage>(`/api/admin-api/billing/packages/${initial.id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await request<TokenPackage>('/api/admin-api/billing/packages', {
          method: 'POST',
          body: payload,
        });
      }
      toast('保存成功', 'success');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={initial ? '编辑套餐' : '新增套餐'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="套餐名称">
          <TextInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="如：备赛包"
          />
        </Field>
        <Field label="售价（元）">
          <TextInput
            type="number"
            value={form.priceYuan}
            onChange={(e) => setForm((f) => ({ ...f, priceYuan: e.target.value }))}
            placeholder="30"
          />
        </Field>
        <Field label="基础 Token">
          <TextInput
            type="number"
            value={form.tokens}
            onChange={(e) => setForm((f) => ({ ...f, tokens: e.target.value }))}
            placeholder="3500"
          />
        </Field>
        <Field label="赠送 Token">
          <TextInput
            type="number"
            value={form.bonusTokens}
            onChange={(e) => setForm((f) => ({ ...f, bonusTokens: e.target.value }))}
            placeholder="500"
          />
        </Field>
        <Field label="排序（小的在前）">
          <TextInput
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Toggle
              checked={form.enabled}
              onChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
            立即上架
          </label>
        </div>
        <div className="col-span-2">
          <Field label="套餐描述">
            <TextInput
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="如：备赛期主力，赠送 500 Token"
            />
          </Field>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
