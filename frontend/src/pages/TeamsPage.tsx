import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, Plus, Users } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import type { Team, TeamApplication } from '../lib/types';
import { Button, Card, EmptyState, Field, Skeleton, TextInput } from '../components/ui';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [myApps, setMyApps] = useState<TeamApplication[]>([]);
  const [recruitingOnly, setRecruitingOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    request<Team[]>('/api/teams', {
      params: {
        recruiting: recruitingOnly ? 'true' : '',
        keyword,
      },
    })
      .then((d) => setTeams(d ?? []))
      .catch(() => setTeams([]));
    request<Team[]>('/api/teams/mine')
      .then((d) => setMyTeams(d ?? []))
      .catch(() => setMyTeams([]));
    request<TeamApplication[]>('/api/teams/applications/mine')
      .then((d) => setMyApps(d ?? []))
      .catch(() => setMyApps([]));
  };

  useEffect(load, [recruitingOnly, keyword]);

  const myTeamIds = new Set(myTeams.map((t) => t.id));
  const pendingApps = myApps.filter((a) => a.status === 'PENDING');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">团队广场</h1>
          <p className="mt-1 text-sm text-zinc-400">创建你的参赛团队，或申请加入正在招募的队伍</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          创建团队
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative md:w-64">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索团队名称"
            className="w-full rounded-[10px] border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400"
          />
        </div>
        <button
          onClick={() => setRecruitingOnly(!recruitingOnly)}
          className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
            recruitingOnly ? 'bg-brand-600 text-white' : 'bg-white text-zinc-500 ring-1 ring-zinc-200'
          }`}
        >
          只看招募中
        </button>
        {pendingApps.length > 0 && (
          <span className="text-xs text-zinc-400">
            {pendingApps.length} 个待审批申请
          </span>
        )}
      </div>

      {/* 我的申请状态 */}
      {myApps.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium text-zinc-500">我的入队申请</p>
          <div className="flex flex-col gap-1.5">
            {myApps.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-600">{a.team?.name ?? '未知团队'}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${
                    a.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-600'
                      : a.status === 'APPROVED'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {a.status === 'PENDING' ? '待审批' : a.status === 'APPROVED' ? '已通过' : '已拒绝'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 团队列表 */}
      {teams === null ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          title="还没有团队"
          description="创建第一个团队，召集志同道合的队友一起参赛。"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              创建团队
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`}>
              <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-zinc-900">{t.name}</h3>
                  {t.recruiting ? (
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 ring-1 ring-brand-200">
                      招募中
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
                      已满员
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{t.slogan}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                  {t.description}
                </p>
                {t.targetCompetition && (
                  <p className="mt-2 truncate text-xs text-brand-600">
                    目标：{t.targetCompetition}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} />
                    {t.memberCount}/{t.sizeLimit} 人
                  </span>
                  <span>队长：{t.leader?.name}</span>
                  {myTeamIds.has(t.id) && (
                    <span className="ml-auto rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-500">
                      已加入
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [description, setDescription] = useState('');
  const [targetCompetition, setTargetCompetition] = useState('');
  const [sizeLimit, setSizeLimit] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('请填写团队名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await request<Team>('/api/teams', {
        method: 'POST',
        body: {
          name: name.trim(),
          slogan: slogan.trim(),
          description: description.trim(),
          targetCompetition: targetCompetition.trim(),
          sizeLimit,
          recruiting: true,
        },
      });
      toast('团队创建成功', 'success');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">创建团队</h2>
        <p className="mt-1 text-sm text-zinc-400">创建后你将成为队长，团队默认开启招募</p>
        <div className="mt-5 flex flex-col gap-4">
          <Field label="团队名称" error={error}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：星辰算法队" autoFocus />
          </Field>
          <Field label="团队口号（选填）">
            <TextInput value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="一句话介绍团队" />
          </Field>
          <Field label="团队介绍（选填）">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="介绍团队目标、招募要求等"
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </Field>
          <Field label="目标竞赛（选填）">
            <TextInput value={targetCompetition} onChange={(e) => setTargetCompetition(e.target.value)} placeholder="例如：全国大学生数学建模竞赛" />
          </Field>
          <Field label="人数上限">
            <select
              value={sizeLimit}
              onChange={(e) => setSizeLimit(Number(e.target.value))}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {[2, 3, 4, 5, 6, 8, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n} 人
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '创建中…' : '创建'}
          </Button>
        </div>
      </div>
    </div>
  );
}
