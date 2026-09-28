import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PencilSimple } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import {
  DISCIPLINE_OPTIONS,
  GOAL_OPTIONS,
  GRADE_LABELS,
  INTEREST_OPTIONS,
  LEVEL_OPTIONS,
  SKILL_OPTIONS,
  WEEKLY_HOURS_OPTIONS,
} from '../lib/labels';
import type { UserProfile } from '../lib/types';
import { Button, Card, ChipGroupCustom, Field, Skeleton, TextInput } from '../components/ui';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserProfile>({});
  const [customDiscipline, setCustomDiscipline] = useState('');

  useEffect(() => {
    request<UserProfile>('/api/profile')
      .then((p) => {
        setProfile(p);
        setForm(p ?? {});
      })
      .catch(() => setProfile(null));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: UserProfile = {
        ...form,
        discipline: form.discipline === '其他' ? customDiscipline.trim() || '其他' : form.discipline,
      };
      await request<UserProfile>('/api/profile', { method: 'PUT', body: payload });
      setProfile(payload);
      setEditing(false);
      toast('画像已更新，重新生成推荐会更准', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (profile === null) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <p className="text-sm text-zinc-400">你还没有完成画像问卷</p>
        <Button className="mt-4" onClick={() => navigate('/onboarding')}>
          开始画像问卷
          <ArrowRight size={15} />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">我的画像</h1>
          <p className="mt-1 text-sm text-zinc-400">推荐结果的依据，随时可以更新</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PencilSimple size={15} />
            编辑
          </Button>
        )}
      </div>

      {!editing ? (
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-zinc-800">社区身份</p>
              <p className="mt-0.5 text-xs text-zinc-400">展示在论坛帖子与回复中,帮助队友建立信任</p>
            </div>
            {form.verified ? (
              <span className="flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                ✓ 已认证
              </span>
            ) : (
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-400">未认证</span>
            )}
          </div>
          <Row label="学校" value={form.school || '-'} />
          <Row label="获奖履历" value={form.achievements || '-'} />
          <Row label="学科" value={form.discipline ?? '-'} />
          <Row label="专业" value={form.major ?? '-'} />
          <Row label="年级" value={form.grade ? GRADE_LABELS[form.grade] ?? String(form.grade) : '-'} />
          <Row label="兴趣" value={form.interests?.join(' · ') ?? '-'} />
          <Row label="技能" value={form.skills?.join(' · ') ?? '-'} />
          <Row label="目标" value={form.goals?.join(' · ') ?? '-'} />
          <Row
            label="每周投入"
            value={form.weeklyHours ? `约 ${form.weeklyHours} 小时` : '-'}
          />
          <Row label="参赛经历" value={form.hasExperience ? '有' : '无'} />
          <Row
            label="偏好级别"
            value={
              form.preferredLevel
                ? ({
                    SCHOOL: '校级',
                    PROVINCIAL: '省级',
                    NATIONAL: '国家级',
                    INTERNATIONAL: '国际级',
                  } as Record<string, string>)[form.preferredLevel] ?? form.preferredLevel
                : '-'
            }
          />
          <Row label="补充描述" value={form.description || '-'} />
        </Card>
      ) : (
        <Card className="flex flex-col gap-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="学科">
              <select
                value={form.discipline ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {DISCIPLINE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                {form.discipline && !DISCIPLINE_OPTIONS.includes(form.discipline) && (
                  <option value={form.discipline}>{form.discipline}</option>
                )}
              </select>
            </Field>
            {form.discipline === '其他' && (
              <Field label="具体学科">
                <TextInput
                  value={customDiscipline}
                  onChange={(e) => setCustomDiscipline(e.target.value)}
                  placeholder="输入你的学科"
                />
              </Field>
            )}
            <Field label="年级">
              <select
                value={form.grade ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, grade: Number(e.target.value) }))}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABELS[g]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="专业">
            <TextInput
              value={form.major ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
            />
          </Field>
          <Field label="学校" hint="展示在论坛帖子中,帮助队友了解你">
            <TextInput
              value={form.school ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
              placeholder="例如:XX大学"
            />
          </Field>
          <Field label="获奖履历（选填）" hint="每行一条,例如:2025 全国大学生数学建模竞赛 省一等奖">
            <textarea
              value={form.achievements ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))}
              rows={3}
              placeholder={'2025 全国大学生数学建模竞赛 省一等奖\n2025 蓝桥杯省赛 二等奖'}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400"
            />
          </Field>
          <Field label="兴趣">
            <ChipGroupCustom
              options={INTEREST_OPTIONS}
              values={form.interests ?? []}
              onChange={(v) => setForm((f) => ({ ...f, interests: v }))}
              placeholder="输入你的兴趣，回车添加"
            />
          </Field>
          <Field label="技能">
            <ChipGroupCustom
              options={SKILL_OPTIONS}
              values={form.skills ?? []}
              onChange={(v) => setForm((f) => ({ ...f, skills: v }))}
              placeholder="输入你的技能，回车添加"
            />
          </Field>
          <Field label="目标">
            <ChipGroupCustom
              options={GOAL_OPTIONS}
              values={form.goals ?? []}
              onChange={(v) => setForm((f) => ({ ...f, goals: v }))}
              placeholder="输入你的目标，回车添加"
            />
          </Field>
          <Field label="每周可投入时间">
            <div className="flex flex-wrap gap-2">
              {WEEKLY_HOURS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, weeklyHours: o.value }))}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    form.weeklyHours === o.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="补充描述">
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setForm(profile); setEditing(false); }}>
              取消
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
      <span className="w-20 shrink-0 text-sm text-zinc-400">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-zinc-700">{value}</span>
    </div>
  );
}
