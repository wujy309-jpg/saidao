import { useCallback, useEffect, useState } from 'react';
import { PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import type { Category, Competition, Format, Level } from '../lib/types';
import { Badge, Button, Card, Empty, Field, Modal, Select, Table, TextInput, Textarea, Toggle } from '../components/ui';

const CATEGORY_META: Record<Category, string> = {
  ENGINEERING: '工科',
  SCIENCE: '理科',
  LIBERAL_ARTS: '文科',
  COMPREHENSIVE: '综合',
};
const LEVEL_META: Record<Level, string> = {
  SCHOOL: '校级',
  PROVINCIAL: '省级',
  NATIONAL: '国家级',
  INTERNATIONAL: '国际级',
};
const CATALOG_META: Record<string, string> = {
  教育部目录: '教育部目录',
  高教学会榜单: '高教学会榜单',
  行业大赛: '行业大赛',
  国际赛事: '国际赛事',
};

export default function CompetitionsPage() {
  const [list, setList] = useState<Competition[] | null>(null);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    request<Competition[]>('/api/competitions/admin/all')
      .then((d) => setList(d ?? []))
      .catch(() => setList([]));
  }, []);

  useEffect(load, [load]);

  const remove = async (c: Competition) => {
    if (!window.confirm(`确认删除「${c.name}」？`)) return;
    try {
      await request<void>(`/api/competitions/${c.id}`, { method: 'DELETE' });
      toast('已删除', 'success');
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '删除失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">竞赛管理</h1>
          <p className="mt-1 text-sm text-zinc-400">维护竞赛库（原主站后台功能迁入）</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          <Plus size={15} />
          新增竞赛
        </Button>
      </div>

      <Card>
        <Table head={['竞赛', '类别', '级别', '状态', '操作']}>
          {(list ?? []).length === 0 && (
            <tr>
              <td colSpan={5}>
                <Empty text="暂无竞赛" />
              </td>
            </tr>
          )}
          {(list ?? []).map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-zinc-800">{c.name}</p>
                <p className="max-w-md truncate text-xs text-zinc-400">
                  {c.organizer ?? '-'}
                  {c.catalogList ? ` · ${CATALOG_META[c.catalogList] ?? c.catalogList}` : ''}
                  {c.baoyanBonus ? ' · 保研加分' : ''}
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge cls="bg-blue-50 text-blue-700 ring-blue-200">{CATEGORY_META[c.category] ?? c.category}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge cls="bg-violet-50 text-violet-700 ring-violet-200">{LEVEL_META[c.level] ?? c.level}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge cls={c.status === 'ACTIVE' ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-zinc-100 text-zinc-500 ring-zinc-200'}>
                  {c.status === 'ACTIVE' ? '进行中' : '已结束'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    title="编辑"
                    onClick={() => {
                      setCreating(false);
                      setEditing(c);
                    }}
                  >
                    <PencilSimple size={15} />
                  </button>
                  <button
                    className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    title="删除"
                    onClick={() => remove(c)}
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
        <CompetitionForm
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

function CompetitionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Competition | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: (initial?.category ?? 'ENGINEERING') as Category,
    level: (initial?.level ?? 'NATIONAL') as Level,
    format: (initial?.format ?? 'INDIVIDUAL') as Format,
    organizer: initial?.organizer ?? '',
    difficulty: initial?.difficulty ?? 3,
    prestige: initial?.prestige ?? 3,
    teamSizeMax: initial?.teamSizeMax ?? 1,
    registrationStart: initial?.registrationStart ?? '',
    registrationEnd: initial?.registrationEnd ?? '',
    competitionDate: initial?.competitionDate ?? '',
    disciplines: (initial?.disciplines ?? []).join('、'),
    tags: (initial?.tags ?? []).join('、'),
    description: initial?.description ?? '',
    officialUrl: initial?.officialUrl ?? '',
    catalogList: initial?.catalogList ?? '',
    baoyanBonus: initial?.baoyanBonus ?? false,
    entryFee: initial?.entryFee ?? '',
    rules: initial?.rules ?? '',
    status: (initial?.status ?? 'ACTIVE') as string,
    suitableGrades: (initial?.suitableGrades ?? [1, 2, 3, 4]).join(','),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim()) {
      setError('请填写竞赛名称');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      teamSizeMax: Number(form.teamSizeMax) || 1,
      difficulty: Number(form.difficulty),
      prestige: Number(form.prestige),
      disciplines: form.disciplines.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      suitableGrades: form.suitableGrades.split(',').map((s) => Number(s.trim())).filter(Boolean),
      registrationStart: form.registrationStart || null,
      registrationEnd: form.registrationEnd || null,
    };
    try {
      if (initial) {
        await request<Competition>(`/api/competitions/${initial.id}`, { method: 'PUT', body: payload });
      } else {
        await request<Competition>('/api/competitions', { method: 'POST', body: payload });
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
      title={initial ? '编辑竞赛' : '新增竞赛'}
      onClose={onClose}
      wide
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="竞赛名称">
          <TextInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="竞赛全称"
          />
        </Field>
        <Field label="类别">
          <Select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
          >
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="级别">
          <Select
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as Level }))}
          >
            {(Object.keys(LEVEL_META) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_META[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="形式">
          <Select
            value={form.format}
            onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as Format }))}
          >
            <option value="INDIVIDUAL">个人赛</option>
            <option value="TEAM">团队赛</option>
          </Select>
        </Field>
        <Field label="主办方">
          <TextInput
            value={form.organizer}
            onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))}
          />
        </Field>
        <Field label="难度 (1-5)">
          <TextInput
            type="number"
            min={1}
            max={5}
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
          />
        </Field>
        <Field label="含金量 (1-5)">
          <TextInput
            type="number"
            min={1}
            max={5}
            value={form.prestige}
            onChange={(e) => setForm((f) => ({ ...f, prestige: Number(e.target.value) }))}
          />
        </Field>
        <Field label="团队人数上限">
          <TextInput
            type="number"
            min={1}
            value={form.teamSizeMax}
            onChange={(e) => setForm((f) => ({ ...f, teamSizeMax: Number(e.target.value) }))}
          />
        </Field>
        <Field label="报名开始">
          <TextInput
            type="date"
            value={form.registrationStart}
            onChange={(e) => setForm((f) => ({ ...f, registrationStart: e.target.value }))}
          />
        </Field>
        <Field label="报名截止">
          <TextInput
            type="date"
            value={form.registrationEnd}
            onChange={(e) => setForm((f) => ({ ...f, registrationEnd: e.target.value }))}
          />
        </Field>
        <Field label="比赛时间">
          <TextInput
            value={form.competitionDate}
            onChange={(e) => setForm((f) => ({ ...f, competitionDate: e.target.value }))}
            placeholder="2027-08"
          />
        </Field>
        <Field label="适合年级（逗号分隔 1-5）">
          <TextInput
            value={form.suitableGrades}
            onChange={(e) => setForm((f) => ({ ...f, suitableGrades: e.target.value }))}
            placeholder="1,2,3,4"
          />
        </Field>
        <Field label="相关学科（顿号分隔）">
          <TextInput
            value={form.disciplines}
            onChange={(e) => setForm((f) => ({ ...f, disciplines: e.target.value }))}
            placeholder="计算机、软件"
          />
        </Field>
        <Field label="标签（顿号分隔）">
          <TextInput
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="算法、编程"
          />
        </Field>
        <Field label="官网链接">
          <TextInput
            value={form.officialUrl}
            onChange={(e) => setForm((f) => ({ ...f, officialUrl: e.target.value }))}
          />
        </Field>
        <Field label="竞赛目录">
          <Select
            value={form.catalogList}
            onChange={(e) => setForm((f) => ({ ...f, catalogList: e.target.value }))}
          >
            <option value="">未分类</option>
            {Object.entries(CATALOG_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="报名费说明">
          <TextInput
            value={form.entryFee}
            onChange={(e) => setForm((f) => ({ ...f, entryFee: e.target.value }))}
            placeholder="免费 / 低(≤100元) / 中(100-500元)"
          />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <Toggle
              checked={form.baoyanBonus}
              onChange={(v) => setForm((f) => ({ ...f, baoyanBonus: v }))}
            />
            保研加分
          </label>
        </div>
        <Field label="状态">
          <Select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ACTIVE">进行中</option>
            <option value="CLOSED">已结束</option>
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label="简介">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="赛制规则与评审标准（AI 助手参考）">
            <Textarea
              rows={4}
              value={form.rules}
              onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
              placeholder="主办方/参赛对象/赛程/组队要求/评审标准/奖项设置"
            />
          </Field>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
