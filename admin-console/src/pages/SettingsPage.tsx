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
        <p className="mt-1 text-sm text-zinc-400">免费额度、收款说明与收款码，保存后即时生效</p>
      </div>

      <Card className="divide-y divide-zinc-100">
        {/* 免费额度 */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-zinc-800">免费额度（获客）</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="注册赠送 Token" hint="新用户注册时一次性到账">
              <TextInput
                type="number"
                value={form.registerBonusTokens}
                onChange={(e) =>
                  setForm((f) => f && { ...f, registerBonusTokens: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="每日免费 Token" hint="用户每天首次登录自动到账">
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
