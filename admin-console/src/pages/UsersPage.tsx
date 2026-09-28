import { useCallback, useEffect, useState } from 'react';
import { PencilSimple, ShieldCheck, TrashSimple, Wallet } from '@phosphor-icons/react';
import { fmtNum, fmtTime, request, toast, TX_TYPE_META } from '../lib/api';
import type { PageResponse, TokenTransaction, UserBalanceView } from '../lib/types';
import { Badge, Button, Card, Empty, Field, Modal, Pagination, Table, TextInput, Textarea } from '../components/ui';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [data, setData] = useState<PageResponse<UserBalanceView> | null>(null);
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [adjusting, setAdjusting] = useState<UserBalanceView | null>(null);
  const [viewingTx, setViewingTx] = useState<UserBalanceView | null>(null);

  const load = useCallback(() => {
    request<PageResponse<UserBalanceView>>('/api/admin-api/billing/users', {
      params: { page: String(page), size: String(PAGE_SIZE), keyword: query },
    })
      .then(setData)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'));
  }, [page, query]);

  useEffect(load, [load]);

  const resetPassword = async (u: UserBalanceView) => {
    if (!window.confirm(`重置「${u.username}」的密码为 123456？`)) return;
    try {
      await request<void>(`/api/users/${u.userId}/reset-password`, { method: 'PUT' });
      toast('密码已重置为 123456', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  const verifyUser = async (u: UserBalanceView) => {
    try {
      await request<boolean>(`/api/users/${u.userId}/verify`, { method: 'PUT' });
      toast('已切换认证状态', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '操作失败', 'error');
    }
  };

  const removeUser = async (u: UserBalanceView) => {
    if (!window.confirm(`确认删除用户「${u.username}」？`)) return;
    try {
      await request<void>(`/api/users/${u.userId}`, { method: 'DELETE' });
      toast('已删除', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">用户与余额</h1>
        <p className="mt-1 text-sm text-zinc-400">查看 Token 余额，手动加币/扣币（全部留痕）</p>
      </div>

      <div className="flex gap-2">
        <TextInput
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setPage(0);
              setQuery(keyword.trim());
            }
          }}
          placeholder="搜索姓名 / 用户名"
          className="w-64"
        />
        <Button
          onClick={() => {
            setPage(0);
            setQuery(keyword.trim());
          }}
        >
          搜索
        </Button>
      </div>

      <Card>
        <Table head={['用户', '部门', '余额', '累计充值', '累计消耗', '角色', '操作']}>
          {(data?.content ?? []).length === 0 && (
            <tr>
              <td colSpan={7}>
                <Empty text="暂无用户" />
              </td>
            </tr>
          )}
          {(data?.content ?? []).map((u) => (
            <tr key={u.userId}>
              <td className="px-4 py-3">
                <p className="font-medium text-zinc-800">{u.name}</p>
                <p className="text-xs text-zinc-400">@{u.username}</p>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">{u.department ?? '-'}</td>
              <td className="num px-4 py-3">
                <span className="font-semibold text-brand-700">{fmtNum(u.balance)}</span>
                <span className="ml-1 text-xs text-zinc-400">Token</span>
              </td>
              <td className="num px-4 py-3 text-xs text-zinc-500">{fmtNum(u.totalRecharged)}</td>
              <td className="num px-4 py-3 text-xs text-zinc-500">{fmtNum(u.totalConsumed)}</td>
              <td className="px-4 py-3">
                <Badge cls={u.role === 'ADMIN' ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-brand-50 text-brand-700 ring-brand-200'}>
                  {u.role === 'ADMIN' ? '管理员' : '学生'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Button variant="subtle" size="sm" onClick={() => setAdjusting(u)}>
                    <Wallet size={13} />
                    调整余额
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewingTx(u)}>
                    流水
                  </Button>
                  {u.role !== 'ADMIN' && (
                    <>
                      <button
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        title="重置密码"
                        onClick={() => resetPassword(u)}
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-sky-50 hover:text-sky-600"
                        title="认证/取消认证"
                        onClick={() => verifyUser(u)}
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        title="删除用户"
                        onClick={() => removeUser(u)}
                      >
                        <TrashSimple size={14} />
                      </button>
                    </>
                  )}
                </div>
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

      {adjusting && <AdjustModal user={adjusting} onClose={() => setAdjusting(null)} onDone={load} />}
      {viewingTx && <TxModal user={viewingTx} onClose={() => setViewingTx(null)} />}
    </div>
  );
}

/* ============ 调整余额 ============ */

function AdjustModal({
  user,
  onClose,
  onDone,
}: {
  user: UserBalanceView;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      toast('请输入不为 0 的数量（正数加币 / 负数扣币）', 'error');
      return;
    }
    setSaving(true);
    try {
      await request<void>(`/api/admin-api/billing/users/${user.userId}/adjust`, {
        method: 'POST',
        body: { amount: n, remark: remark.trim() },
      });
      toast(`已调整「${user.username}」余额 ${n > 0 ? '+' : ''}${n} Token`, 'success');
      onDone();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : '调整失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`调整余额 · ${user.name}（当前 ${fmtNum(user.balance)} Token）`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '确认调整'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="数量（正数加币 / 负数扣币）" hint="如 +100 表示赠送 100 Token，-50 表示扣减 50">
          <TextInput
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如 100 或 -50"
          />
        </Field>
        <Field label="备注（写入流水，建议填写原因）">
          <Textarea
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="如：线下活动赠送 / 投诉补偿 / 违规扣减"
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ============ 用户流水 ============ */

function TxModal({ user, onClose }: { user: UserBalanceView; onClose: () => void }) {
  const [data, setData] = useState<PageResponse<TokenTransaction> | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    request<PageResponse<TokenTransaction>>(`/api/admin-api/billing/users/${user.userId}/transactions`, {
      params: { page: String(page), size: '15' },
    })
      .then(setData)
      .catch(() => setData(null));
  }, [user.userId, page]);

  return (
    <Modal title={`${user.name} 的 Token 流水`} onClose={onClose} wide>
      <Table head={['类型', '场景', '数量', '余额', '备注', '时间']}>
        {(data?.content ?? []).length === 0 && (
          <tr>
            <td colSpan={6}>
              <Empty text="暂无流水" />
            </td>
          </tr>
        )}
        {(data?.content ?? []).map((tx) => (
          <tr key={tx.id}>
            <td className="px-4 py-2.5">
              <Badge cls={TX_TYPE_META[tx.type]?.cls}>{TX_TYPE_META[tx.type]?.label ?? tx.type}</Badge>
            </td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{tx.scene ?? '-'}</td>
            <td className={`num px-4 py-2.5 font-semibold ${tx.amount >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
              {tx.amount >= 0 ? '+' : ''}
              {fmtNum(tx.amount)}
            </td>
            <td className="num px-4 py-2.5 text-xs text-zinc-500">{fmtNum(tx.balanceAfter)}</td>
            <td className="px-4 py-2.5 text-xs text-zinc-500">{tx.remark ?? '-'}</td>
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
    </Modal>
  );
}
