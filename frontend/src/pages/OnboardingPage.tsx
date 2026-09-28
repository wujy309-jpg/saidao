import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, UserCirclePlus } from '@phosphor-icons/react';
import { clearPendingProfile, isLoggedIn, request, savePendingProfile, toast } from '../lib/api';
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
import { Button, ChipGroupCustom, Field, TextInput } from '../components/ui';

const STEPS = ['学科背景', '年级', '兴趣方向', '技能储备', '目标与投入', '补充信息'];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-all active:translate-y-[1px] ${
        selected
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [discipline, setDiscipline] = useState<string | null>(null);
  const [customDiscipline, setCustomDiscipline] = useState('');
  const [major, setMajor] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<number | null>(null);
  const [hasExperience, setHasExperience] = useState<boolean | null>(null);
  const [preferredLevel, setPreferredLevel] = useState<string>('NATIONAL');
  const [description, setDescription] = useState('');

  const canNext = () => {
    if (step === 0) {
      if (discipline === null) return false;
      if (discipline === '其他') return customDiscipline.trim().length > 0;
      return true;
    }
    if (step === 1) return grade !== null;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return weeklyHours !== null && hasExperience !== null;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const finalDiscipline =
        discipline === '其他' ? customDiscipline.trim() : (discipline ?? '');
      const payload: UserProfile = {
        discipline: finalDiscipline,
        major: major || undefined,
        grade: grade ?? 1,
        interests,
        skills,
        goals,
        weeklyHours: weeklyHours ?? 5,
        hasExperience: hasExperience ?? false,
        preferredLevel,
        description: description || undefined,
      };
      // 游客模式:暂存问卷,注册/登录后自动保存并生成推荐
      if (!isLoggedIn()) {
        savePendingProfile(payload);
        toast('问卷已暂存,注册后自动生成推荐', 'success');
        navigate('/register', { state: { fromOnboarding: true } });
        return;
      }
      await request<UserProfile>('/api/profile', { method: 'PUT', body: payload });
      clearPendingProfile();
      toast('画像已保存', 'success');
      navigate('/', { state: { fresh: true } });
    } catch (err) {
      toast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      {/* 游客提示 */}
      {!isLoggedIn() && (
        <div className="mb-6 flex items-center gap-2.5 rounded-[10px] bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-200">
          <UserCirclePlus size={18} className="shrink-0 text-brand-600" />
          <span>
            游客模式:先完成问卷,注册后自动保存并生成推荐
          </span>
        </div>
      )}

      {/* 步骤指示 */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i < step ? 'bg-brand-600' : i === step ? 'bg-brand-400' : 'bg-zinc-200'
                }`}
              />
              <span
                className={`text-xs ${
                  i === step ? 'font-medium text-zinc-800' : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-lg font-semibold text-zinc-900">
          {step === 0 && '你的学科背景是什么？'}
          {step === 1 && '你现在读几年级？'}
          {step === 2 && '你对哪些方向感兴趣？'}
          {step === 3 && '你掌握哪些技能？'}
          {step === 4 && '你参赛的目标和可投入时间？'}
          {step === 5 && '还有什么想告诉我们的？'}
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          {step === 0 && '这决定了推荐比赛的学科侧重'}
          {step === 1 && '不同比赛适合不同年级，我们会为你过滤'}
          {step === 2 && '可多选，越多越精准'}
          {step === 3 && '可多选，如实填写即可'}
          {step === 4 && '目标影响推荐的含金量与难度'}
          {step === 5 && '选填，最后一步'}
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-zinc-200/80 bg-white p-6 md:p-8">
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DISCIPLINE_OPTIONS.map((d) => (
                <Chip key={d} selected={discipline === d} onClick={() => setDiscipline(d)}>
                  {d}
                </Chip>
              ))}
            </div>
            {discipline === '其他' && (
              <Field label="具体学科" hint="例如：心理学、体育、护理等，支持自由填写">
                <TextInput
                  value={customDiscipline}
                  onChange={(e) => setCustomDiscipline(e.target.value)}
                  placeholder="输入你的学科"
                  autoFocus
                />
              </Field>
            )}
            <Field label="专业（选填）">
              <TextInput
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="例如：计算机科学与技术"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((g) => (
              <Chip key={g} selected={grade === g} onClick={() => setGrade(g)}>
                {GRADE_LABELS[g]}
              </Chip>
            ))}
          </div>
        )}

        {step === 2 && (
          <ChipGroupCustom
            options={INTEREST_OPTIONS}
            values={interests}
            onChange={setInterests}
            placeholder="输入你的兴趣，回车添加"
          />
        )}

        {step === 3 && (
          <ChipGroupCustom
            options={SKILL_OPTIONS}
            values={skills}
            onChange={setSkills}
            placeholder="输入你的技能，回车添加"
          />
        )}

        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2.5 text-sm font-medium text-zinc-700">参赛目标（可多选）</p>
              <ChipGroupCustom
                options={GOAL_OPTIONS}
                values={goals}
                onChange={setGoals}
                placeholder="输入你的目标，回车添加"
              />
            </div>
            <div>
              <p className="mb-2.5 text-sm font-medium text-zinc-700">每周可投入时间</p>
              <div className="flex flex-wrap gap-2.5">
                {WEEKLY_HOURS_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    selected={weeklyHours === o.value}
                    onClick={() => setWeeklyHours(o.value)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2.5 text-sm font-medium text-zinc-700">之前参加过学科竞赛吗？</p>
              <div className="flex gap-2.5">
                <Chip selected={hasExperience === true} onClick={() => setHasExperience(true)}>
                  参加过
                </Chip>
                <Chip selected={hasExperience === false} onClick={() => setHasExperience(false)}>
                  还没有
                </Chip>
              </div>
            </div>
            <Field label="偏好的竞赛级别">
              <select
                value={preferredLevel}
                onChange={(e) => setPreferredLevel(e.target.value)}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l === 'SCHOOL' ? '校级' : l === 'PROVINCIAL' ? '省级' : l === 'NATIONAL' ? '国家级' : '国际级'}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 5 && (
          <Field label="补充描述（选填）" hint="例如想参加的某类比赛、时间限制、特殊需求等">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="自由发挥，让推荐更懂你…"
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400"
            />
          </Field>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() =>
              step === 0
                ? navigate(isLoggedIn() ? '/' : '/')
                : setStep(step - 1)
            }
            disabled={submitting}
          >
            <ArrowLeft size={15} />
            {step === 0 ? '取消' : '上一步'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              下一步
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? '保存中…' : isLoggedIn() ? '完成，开始探索' : '完成，去注册'}
              {!submitting && <Check size={16} />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
