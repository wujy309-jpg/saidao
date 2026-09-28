import { useCallback, useEffect, useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import { fmtNum, request, toast } from '../lib/api';
import type { TokenSceneConfig } from '../lib/types';
import { Badge, Button, Card, Empty, Table, TextInput, Toggle } from '../components/ui';

export default function ScenesPage() {
  const [list, setList] = useState<TokenSceneConfig[] | null>(null);
  const [draft, setDraft] = useState<Record<string, { price: string; enabled: boolean; label: string }>>({});

  const load = useCallback(() => {
    request<TokenSceneConfig[]>('/api/admin-api/billing/scenes').then((d) => {
      setList(d ?? []);
      const next: Record<string, { price: string; enabled: boolean; label: string }> = {};
      (d ?? []).forEach((s) => {
        next[s.scene] = { price: String(s.price), enabled: s.enabled, label: s.label };
      });
      setDraft(next);
    });
  }, []);

  useEffect(load, [load]);

  const save = async (scene: TokenSceneConfig) => {
    const d = draft[scene.scene];
    const price = Number(d?.price);
    if (!Number.isInteger(price) || price < 0) {
      toast('请输入不小于 0 的整数单价', 'error');
      return;
    }
    try {
      await request<TokenSceneConfig>(`/api/admin-api/billing/scenes/${scene.scene}`, {
        method: 'PUT',
        body: { price, enabled: d.enabled, label: d.label },
      });
      toast(`「${d.label}」定价已更新`, 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '保存失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">场景定价</h1>
        <p className="mt-1 text-sm text-zinc-400">
          每个 AI 功能按次扣 Token，单价实时生效；关闭开关则该场景免费。按 1 Token = ¥0.01 定价。
        </p>
      </div>

      <Card>
        <Table head={['场景', '单价（Token/次）', '折合人民币', '是否收费', '保存']}>
          {(list ?? []).length === 0 && (
            <tr>
              <td colSpan={5}>
                <Empty text="暂无场景" />
              </td>
            </tr>
          )}
          {(list ?? []).map((s) => {
            const d = draft[s.scene] ?? { price: String(s.price), enabled: s.enabled, label: s.label };
            return (
              <tr key={s.scene}>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-800">{d.label}</p>
                  <p className="num text-xs text-zinc-400">{s.scene}</p>
                </td>
                <td className="px-4 py-3">
                  <TextInput
                    type="number"
                    value={d.price}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [s.scene]: { ...d, price: e.target.value } }))
                    }
                    className="w-28"
                  />
                </td>
                <td className="num px-4 py-3 text-sm text-zinc-500">
                  ≈ ¥{(Number(d.price || 0) / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={d.enabled}
                      onChange={(v) =>
                        setDraft((prev) => ({ ...prev, [s.scene]: { ...d, enabled: v } }))
                      }
                    />
                    <Badge cls={d.enabled ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-zinc-100 text-zinc-500 ring-zinc-200'}>
                      {d.enabled ? '收费' : '免费'}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" onClick={() => save(s)}>
                    <FloppyDisk size={13} />
                    保存
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <p className="text-xs text-zinc-400">
        提示：单价越高收入越多，但也会影响转化；建议结合总览页的「AI 场景消耗」与 DeepSeek 实际账单定期校准。
      </p>
    </div>
  );
}
