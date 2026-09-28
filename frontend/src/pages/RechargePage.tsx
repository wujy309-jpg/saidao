import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coin, Ticket } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { Button, Card, TextInput } from '../components/ui';
import type {
  BillingPaymentInfo,
  RechargeOrder,
  TokenAccount,
  TokenPackage,
  TokenSceneConfig,
  TokenTransaction,
  TxType,
} from '../lib/types';

type Tab = 'packages' | 'card' | 'orders' | 'transactions';

const TX_TYPE_LABEL: Record<TxType, string> = {
  RECHARGE: '订单充值',
  CARD: '卡密兑换',
  CONSUME: 'AI 扣费',
  REFUND: '失败退款',
  GRANT: '免费赠送',
  ADJUST: '手动调整',
};

const SCENE_LABEL: Record<string, string> = {
  ASSISTANT_CHAT: 'AI 助手对话',
  ASSISTANT_CONTINUE: 'AI 助手续写',
  PLAN_GENERATE: '备赛计划生成',
  PLAN_STREAM: '备赛计划生成',
  PLAN_ADJUST: '备赛计划调整',
  TASK_SWAP: '计划任务换一个',
  RECOMMEND: '竞赛智能推荐',
  FORUM_POLISH: '论坛 AI 润色',
  FORUM_SUGGEST: '论坛 AI 建议',
};

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '待确认', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PAID: { label: '已到账', cls: 'bg-brand-50 text-brand-700 ring-brand-200' },
  CANCELLED: { label: '已取消', cls: 'bg-zinc-100 text-zinc-500 ring-zinc-200' },
};

function fmtTime(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const fmtNum = (n: number) => n.toLocaleString('zh-CN');

export default function RechargePage() {
  const [tab, setTab] = useState<Tab>('packages');
  const [account, setAccount] = useState<TokenAccount | null>(null);
  const [scenes, setScenes] = useState<TokenSceneConfig[]>([]);

  const loadAccount = useCallback(() => {
    request<TokenAccount>('/api/token/balance').then(setAccount).catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    loadAccount();
    request<TokenSceneConfig[]>('/api/token/scenes')
      .then((d) => setScenes(d ?? []))
      .catch(() => setScenes([]));
  }, [loadAccount]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
            <Coin size={22} weight="fill" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">充值中心</h1>
            <p className="text-xs text-zinc-400">AI 功能按次消耗 Token，按需充值</p>
          </div>
        </div>
        <div className="ml-auto rounded-[14px] border border-brand-200 bg-brand-50 px-4 py-2.5">
          <p className="text-xs text-brand-700/70">当前余额</p>
          <p className="font-num text-2xl font-bold text-brand-800">
            {account ? fmtNum(account.balance) : '…'}
            <span className="ml-1 text-sm font-semibold">Token</span>
          </p>
        </div>
      </div>

      {/* 场景单价速览 */}
      {scenes.length > 0 && (
        <Card className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3">
          {scenes.map((s) => (
            <span key={s.scene} className="text-xs text-zinc-500">
              {SCENE_LABEL[s.scene] ?? s.label}
              <span className="font-num ml-1 font-semibold text-zinc-700">{s.price}</span> Token/次
            </span>
          ))}
        </Card>
      )}

      <div className="flex rounded-[10px] bg-zinc-100 p-0.5 self-start">
        {(
          [
            ['packages', '充值套餐'],
            ['card', '卡密兑换'],
            ['orders', '我的订单'],
            ['transactions', '消费记录'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              tab === key ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'packages' && <PackagesTab onRecharged={loadAccount} />}
      {tab === 'card' && <CardTab onRecharged={loadAccount} />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'transactions' && <TransactionsTab />}

      <p className="text-xs text-zinc-400">
        充值问题请联系管理员；转账后订单状态变为「已到账」即生效。
        <Link to="/assistant" className="ml-1 text-brand-700 hover:underline">
          回到 AI 助手 →
        </Link>
      </p>
    </div>
  );
}

/* ============ 充值套餐 ============ */

function PackagesTab({ onRecharged }: { onRecharged: () => void }) {
  const [packages, setPackages] = useState<TokenPackage[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [payInfo, setPayInfo] = useState<BillingPaymentInfo | null>(null);
  const [order, setOrder] = useState<RechargeOrder | null>(null);
  const [selected, setSelected] = useState<TokenPackage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    request<TokenPackage[]>('/api/token/packages')
      .then((d) => setPackages(d ?? []))
      .catch(() => setPackages([]));
  }, []);

  const createOrder = async (pkg: TokenPackage) => {
    setCreating(true);
    setError('');
    setSelected(pkg);
    try {
      const data = await request<{ order: RechargeOrder; payment: BillingPaymentInfo }>(
        '/api/token/orders',
        { method: 'POST', body: { packageId: pkg.id, channel: 'OTHER' } }
      );
      setOrder(data.order);
      setPayInfo(data.payment);
    } catch (e) {
      setError(e instanceof Error ? e.message : '下单失败');
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(packages ?? []).map((p) => (
          <Card key={p.id} className="flex flex-col p-4">
            <p className="text-sm font-semibold text-zinc-800">{p.name}</p>
            {p.description && <p className="mt-0.5 text-xs text-zinc-400">{p.description}</p>}
            <p className="font-num mt-3 text-2xl font-bold text-zinc-900">
              ¥{Number(p.priceYuan).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              到账 <span className="font-num font-semibold text-brand-700">{fmtNum(p.tokens)}</span> Token
              {p.bonusTokens > 0 && (
                <span className="font-num text-brand-600">（含赠送 {fmtNum(p.bonusTokens)}）</span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              约合 ¥{(Number(p.priceYuan) / (p.tokens + p.bonusTokens)).toFixed(4)}/Token
            </p>
            <Button
              className="mt-4 w-full"
              disabled={creating && selected?.id === p.id}
              onClick={() => createOrder(p)}
            >
              {creating && selected?.id === p.id ? '创建中…' : '立即充值'}
            </Button>
          </Card>
        ))}
      </div>

      {packages && packages.length === 0 && (
        <Card className="p-10 text-center text-sm text-zinc-400">
          暂无上架套餐，请联系管理员购买卡密
        </Card>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {order && payInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-zinc-900/30"
            onClick={() => {
              setOrder(null);
              setPayInfo(null);
            }}
          />
          <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-y-auto rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
            <h2 className="text-lg font-semibold text-zinc-900">扫码转账</h2>
            <p className="mt-1 text-xs text-zinc-400">
              订单号 <span className="font-num font-semibold text-zinc-700">{order.orderNo}</span> ·
              金额 <span className="font-num font-semibold text-red-600">¥{Number(order.priceYuan).toFixed(2)}</span>
            </p>

            <div className="mt-4 flex justify-center gap-3">
              {payInfo.wechatQrUrl && (
                <div className="text-center">
                  <img
                    src={payInfo.wechatQrUrl}
                    alt="微信收款码"
                    className="h-36 w-36 rounded-[12px] object-cover ring-1 ring-zinc-200"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">微信扫码</p>
                </div>
              )}
              {payInfo.alipayQrUrl && (
                <div className="text-center">
                  <img
                    src={payInfo.alipayQrUrl}
                    alt="支付宝收款码"
                    className="h-36 w-36 rounded-[12px] object-cover ring-1 ring-zinc-200"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">支付宝扫码</p>
                </div>
              )}
              {!payInfo.wechatQrUrl && !payInfo.alipayQrUrl && (
                <p className="rounded-[10px] bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">
                  请按下方说明联系管理员转账
                </p>
              )}
            </div>

            <div className="mt-4 rounded-[10px] bg-brand-50 px-4 py-3 text-sm text-brand-800">
              {payInfo.paymentNote || '转账时请备注订单号，转账后联系管理员确认到账。'}
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => {
                setOrder(null);
                setPayInfo(null);
                setCreating(false);
                onRecharged();
                toast('订单已创建，管理员确认收款后自动到账', 'info');
              }}
            >
              我已完成转账
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ 卡密兑换 ============ */

function CardTab({ onRecharged }: { onRecharged: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const redeem = async () => {
    if (!code.trim()) {
      toast('请输入卡密', 'error');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await request<{ balance: number }>('/api/token/redeem', {
        method: 'POST',
        body: { code: code.trim() },
      });
      setResult(`兑换成功！当前余额 ${fmtNum(data.balance)} Token`);
      setCode('');
      onRecharged();
    } catch (e) {
      toast(e instanceof Error ? e.message : '兑换失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-lg p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
          <Ticket size={20} weight="fill" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">卡密兑换</h2>
          <p className="text-xs text-zinc-400">输入 16 位卡密，立即到账</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <TextInput
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && redeem()}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="font-mono flex-1 tracking-widest"
        />
        <Button onClick={redeem} disabled={busy}>
          {busy ? '兑换中…' : '兑换'}
        </Button>
      </div>
      {result && <p className="mt-3 text-sm font-medium text-brand-700">{result}</p>}
      <p className="mt-3 text-xs text-zinc-400">卡密可向管理员购买，每张卡密仅可使用一次。</p>
    </Card>
  );
}

/* ============ 我的订单 ============ */

function OrdersTab() {
  const [orders, setOrders] = useState<RechargeOrder[] | null>(null);

  useEffect(() => {
    request<{ content: RechargeOrder[] }>('/api/token/orders', { params: { page: '0', size: '50' } })
      .then((d) => setOrders(d?.content ?? []))
      .catch(() => setOrders([]));
  }, []);

  return (
    <Card className="divide-y divide-zinc-100 overflow-hidden">
      {(orders ?? []).length === 0 && (
        <p className="py-10 text-center text-sm text-zinc-400">暂无订单</p>
      )}
      {(orders ?? []).map((o) => (
        <div key={o.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-num truncate text-sm font-medium text-zinc-800">{o.orderNo}</p>
            <p className="text-xs text-zinc-400">
              {o.packageName ?? '-'} · 到账 {fmtNum(o.tokens)} Token · {fmtTime(o.createdAt)}
            </p>
          </div>
          <span className="font-num text-sm font-semibold text-zinc-800">
            ¥{Number(o.priceYuan).toFixed(2)}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${ORDER_STATUS[o.status]?.cls ?? 'bg-zinc-100 text-zinc-500 ring-zinc-200'}`}
          >
            {ORDER_STATUS[o.status]?.label ?? o.status}
          </span>
        </div>
      ))}
    </Card>
  );
}

/* ============ 消费记录 ============ */

function TransactionsTab() {
  const [txs, setTxs] = useState<TokenTransaction[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const size = 20;

  useEffect(() => {
    request<{ content: TokenTransaction[]; totalElements: number }>('/api/token/transactions', {
      params: { page: String(page), size: String(size) },
    })
      .then((d) => {
        setTxs(d?.content ?? []);
        setTotal(d?.totalElements ?? 0);
      })
      .catch(() => setTxs([]));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <Card className="divide-y divide-zinc-100 overflow-hidden">
      {(txs ?? []).length === 0 && <p className="py-10 text-center text-sm text-zinc-400">暂无记录</p>}
      {(txs ?? []).map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-4 py-3">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
              t.type === 'CONSUME'
                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                : t.amount >= 0
                  ? 'bg-brand-50 text-brand-700 ring-brand-200'
                  : 'bg-zinc-100 text-zinc-500 ring-zinc-200'
            }`}
          >
            {TX_TYPE_LABEL[t.type] ?? t.type}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-700">
              {t.scene ? SCENE_LABEL[t.scene] ?? t.scene : t.remark ?? '-'}
            </p>
            <p className="text-xs text-zinc-400">{fmtTime(t.createdAt)}</p>
          </div>
          <span
            className={`font-num text-sm font-semibold ${t.amount >= 0 ? 'text-brand-700' : 'text-red-600'}`}
          >
            {t.amount >= 0 ? '+' : ''}
            {fmtNum(t.amount)}
          </span>
          <span className="font-num text-xs text-zinc-400">余 {fmtNum(t.balanceAfter)}</span>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" disabled={page <= 0} onClick={() => setPage(page - 1)}>
            上一页
          </Button>
          <span className="text-xs text-zinc-400">
            {page + 1} / {totalPages}
          </span>
          <Button variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            下一页
          </Button>
        </div>
      )}
    </Card>
  );
}
