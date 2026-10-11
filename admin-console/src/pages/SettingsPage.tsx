import { useEffect, useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import type { BillingSetting } from '../lib/types';
import { Button, Card, Field, Textarea, TextInput, Toggle } from '../components/ui';

export default function SettingsPage() {
  const [form, setForm] = useState<BillingSetting | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<BillingSetting>('/api/admin-api/billing/settings')
      .then(setForm)
      .catch((e) => toast(e instanceof Error ? e.message : '加载失败', 'error'));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await request<BillingSetting>('/api/admin-api/billing/settings', {
        method: 'PUT',
        body: form,
      });
      toast('设置已保存', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <p className="py-24 text-center text-sm text-zinc-400">加载中…</p>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">平台设置</h1>
        <p className="mt-1 text-sm text-zinc-400">充值开关、免费额度、收款说明与收款码，保存后即时生效</p>
      </div>

      <Card className="divide-y divide-zinc-100">
        {/* 充值开关 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">用户充值</h2>
          <label className="mt-4 flex items-start gap-2 text-sm text-zinc-700">
            <span className="mt-0.5">
              <Toggle
                checked={form.rechargeEnabled === true}
                onChange={(v) => setForm((f) => f && { ...f, rechargeEnabled: v })}
              />
            </span>
            <span>
              开放充值
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                关闭时：用户端「立即充值」按钮显示「暂未开放」，下单接口直接拒绝，
                并且不再向用户下发收款码与转账说明。
                <br />
                <b className="text-amber-700">
                  非经营性 ICP 备案期间必须保持关闭
                </b>
                ——从事有偿服务需先取得 ICP 经营许可证（主体须为公司）。
                详见 docs/赛道-合规调研报告-2026-10.md。
              </span>
            </span>
          </label>
          {form.rechargeEnabled !== true && (
            <p className="mt-3 rounded-[10px] bg-amber-50 px-3 py-2 text-xs text-amber-700">
              当前为免费内测：平台不收取任何费用。请勿通过线下转账、个人收款码或第三方平台
              售卖卡密——那仍属有偿服务，风险不减反增。
            </p>
          )}
        </div>

        {/* 免费额度 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">免费额度（获客）</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="注册赠送积分" hint="新用户注册时一次性到账">
              <TextInput
                type="number"
                value={form.registerBonusTokens}
                onChange={(e) =>
                  setForm((f) => f && { ...f, registerBonusTokens: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="每日免费积分" hint="用户每天首次登录自动到账">
              <TextInput
                type="number"
                value={form.dailyFreeTokens}
                onChange={(e) =>
                  setForm((f) => f && { ...f, dailyFreeTokens: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
            <Toggle
              checked={form.freeQuotaEnabled}
              onChange={(v) => setForm((f) => f && { ...f, freeQuotaEnabled: v })}
            />
            启用免费额度（关闭后注册/每日赠送均停止）
          </label>
        </div>

        {/* 收款信息 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">收款信息（展示在充值中心）</h2>
          {form.rechargeEnabled !== true && (
            <p className="mt-2 text-xs text-zinc-400">
              充值已关闭，以下内容不会下发给用户；重新开放充值后才会生效。
            </p>
          )}
          <div className="mt-4 flex flex-col gap-4">
            <Field label="收款说明" hint="提示用户转账时备注订单号、如何联系管理员">
              <Textarea
                rows={3}
                value={form.paymentNote ?? ''}
                onChange={(e) => setForm((f) => f && { ...f, paymentNote: e.target.value })}
              />
            </Field>
            <Field label="微信收款码图片地址" hint="上传到任意图床/OSS 后粘贴 URL，留空则不展示">
              <TextInput
                value={form.wechatQrUrl ?? ''}
                onChange={(e) => setForm((f) => f && { ...f, wechatQrUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="支付宝收款码图片地址" hint="同上，留空则不展示">
              <TextInput
                value={form.alipayQrUrl ?? ''}
                onChange={(e) => setForm((f) => f && { ...f, alipayQrUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            {(form.wechatQrUrl || form.alipayQrUrl) && (
              <div className="flex gap-3">
                {form.wechatQrUrl && (
                  <img
                    src={form.wechatQrUrl}
                    alt="微信收款码"
                    className="h-28 w-28 rounded-[10px] object-cover ring-1 ring-zinc-200"
                  />
                )}
                {form.alipayQrUrl && (
                  <img
                    src={form.alipayQrUrl}
                    alt="支付宝收款码"
                    className="h-28 w-28 rounded-[10px] object-cover ring-1 ring-zinc-200"
                  />
                )}
              </div>
            )}
          </div>
        </div>
        {/* 成本核算 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">上游成本单价（用于后台成本核算）</h2>
          <p className="mt-1 text-xs text-zinc-400">
            按 DeepSeek 官方账单口径填写「元 / 百万 token」，后台「AI 成本与可观测」会据此回算毛利
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="输入单价（元 / 百万 token）" hint="deepseek-chat 参考值 2">
              <TextInput
                type="number"
                step="0.01"
                value={form.llmInputPricePerMTok}
                onChange={(e) =>
                  setForm((f) => f && { ...f, llmInputPricePerMTok: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="输出单价（元 / 百万 token）" hint="deepseek-chat 参考值 8">
              <TextInput
                type="number"
                step="0.01"
                value={form.llmOutputPricePerMTok}
                onChange={(e) =>
                  setForm((f) => f && { ...f, llmOutputPricePerMTok: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
          </div>
        </div>

        {/* 运营提醒 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">运营提醒</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="待确认订单超时提醒（小时）" hint="超过该时长仍未确认收款的订单会在总览页红条提示">
              <TextInput
                type="number"
                value={form.pendingOrderAlertHours}
                onChange={(e) =>
                  setForm((f) => f && { ...f, pendingOrderAlertHours: Math.max(1, Number(e.target.value)) })
                }
              />
            </Field>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <FloppyDisk size={15} />
          {saving ? '保存中…' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}
