import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitFork, Plus, LockSimple, Globe } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Repo, Team } from '../lib/types';
import { Button, Card, EmptyState, Field, Skeleton, TextInput } from '../components/ui';

export default function ReposPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const presetTeamId = searchParams.get('teamId');
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    if (!user) return;
    request<Repo[]>(`/api/code-repos/user/${user.id}`)
      .then((d) => setRepos(d ?? []))
      .catch(() => setRepos([]));
  };

  useEffect(load, [user]);

  useEffect(() => {
    request<Team[]>('/api/teams/mine')
      .then((d) => setMyTeams(d ?? []))
      .catch(() => setMyTeams([]));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">项目空间</h1>
          <p className="mt-1 text-sm text-zinc-400">团队共享参赛资料：代码、PPT、文档，管理分支与提交</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          新建项目空间
        </Button>
      </div>

      {repos === null ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : repos.length === 0 ? (
        <EmptyState
          title="还没有项目空间"
          description="为你的参赛项目建一个共享空间，代码、PPT、文档和队友都在这里。"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              新建项目空间
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {repos.map((r) => (
            <Link key={r.id} to={`/repos/${r.id}`}>
              <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
                    <GitFork size={18} />
                  </span>
                  {r.visibility === 'PUBLIC' ? (
                    <Globe size={15} className="text-zinc-300" />
                  ) : (
                    <LockSimple size={15} className="text-zinc-300" />
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-zinc-900">{r.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                  {r.description || '暂无描述'}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-zinc-400">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                    {r.language || '未知语言'}
                  </span>
                  <span>{r.defaultBranch ?? 'main'}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && user && (
        <CreateRepoModal
          myTeams={myTeams}
          presetTeamId={presetTeamId}
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

function CreateRepoModal({
  myTeams,
  presetTeamId,
  onClose,
  onCreated,
}: {
  myTeams: Team[];
  presetTeamId?: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [language, setLanguage] = useState('');
  const [teamId, setTeamId] = useState(presetTeamId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('请填写项目空间名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const params = new URLSearchParams({ ownerId: String(user?.id) });
      if (teamId) params.set('teamId', teamId);
      await request<Repo>(`/api/code-repos?${params.toString()}`, {
        method: 'POST',
        body: { name, description, visibility, language: language || undefined },
      });
      toast('项目空间创建成功', 'success');
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
        <h2 className="text-lg font-semibold text-zinc-900">新建项目空间</h2>
        <div className="mt-5 flex flex-col gap-4">
          <Field label="项目空间名称" error={error}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：math-modeling-2027"
              autoFocus
            />
          </Field>
          <Field label="描述（选填）">
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话说明这个项目空间"
            />
          </Field>
          <Field label="语言（选填）">
            <TextInput
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="例如：Python"
            />
          </Field>
          {myTeams.length > 0 && (
            <Field label="关联团队（选填）" hint="挂靠到团队后，团队成员可在团队页看到该空间">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">不关联团队</option>
                {myTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="可见性">
            <div className="flex gap-2">
              {(['PRIVATE', 'PUBLIC'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-[10px] px-3.5 py-2 text-sm transition-colors ${
                    visibility === v
                      ? 'bg-brand-600 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {v === 'PRIVATE' ? '私有' : '公开'}
                </button>
              ))}
            </div>
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
