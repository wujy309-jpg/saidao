import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CrownSimple,
  GitFork,
  Plus,
  SignOut,
  TrashSimple,
  Users,
  X,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { TeamApplication, TeamDetail } from '../lib/types';
import { Button, Card, EmptyState, Skeleton, TextInput } from '../components/ui';

export default function TeamDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<TeamDetail | null>(null);
  const [applications, setApplications] = useState<TeamApplication[]>([]);
  const [showApply, setShowApply] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const d = await request<TeamDetail>(`/api/teams/${id}`);
      setData(d);
      if (d.isLeader) {
        const apps = await request<TeamApplication[]>(`/api/teams/${id}/applications`);
        setApplications(apps ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!data) return <Skeleton className="h-96 w-full" />;

  const t = data.team;
  const pendingApps = applications.filter((a) => a.status === 'PENDING');

  const apply = async (message: string) => {
    try {
      await request(`/api/teams/${id}/apply`, { method: 'POST', body: { message } });
      toast('申请已提交，等待队长审批', 'success');
      setShowApply(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '申请失败', 'error');
    }
  };

  const review = async (appId: number, approve: boolean) => {
    try {
      await request(`/api/teams/${id}/applications/${appId}/review`, {
        method: 'POST',
        body: { approve },
      });
      toast(approve ? '已通过' : '已拒绝', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const removeMember = async (userId: number, name: string) => {
    if (!window.confirm(`移除成员「${name}」？`)) return;
    try {
      await request(`/api/teams/${id}/members/${userId}`, { method: 'DELETE' });
      toast('成员已移除', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '移除失败', 'error');
    }
  };

  const leaveTeam = async () => {
    if (!window.confirm('确认退出团队？')) return;
    try {
      await request(`/api/teams/${id}/leave`, { method: 'POST' });
      toast('已退出团队', 'success');
      navigate('/teams');
    } catch (err) {
      toast(err instanceof Error ? err.message : '退出失败', 'error');
    }
  };

  const disband = async () => {
    if (!window.confirm(`确认解散团队「${t.name}」？成员与项目关联将被解除。`)) return;
    try {
      await request(`/api/teams/${id}`, { method: 'DELETE' });
      toast('团队已解散', 'success');
      navigate('/teams');
    } catch (err) {
      toast(err instanceof Error ? err.message : '解散失败', 'error');
    }
  };

  const toggleRecruiting = async () => {
    try {
      await request(`/api/teams/${id}`, {
        method: 'PUT',
        body: { recruiting: !t.recruiting },
      });
      toast(t.recruiting ? '已关闭招募' : '已开启招募', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link to="/teams" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
        <ArrowLeft size={15} />
        返回团队广场
      </Link>

      {/* 团队信息 */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t.name}</h1>
              {t.recruiting ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 ring-1 ring-brand-200">
                  招募中
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">已满员</span>
              )}
            </div>
            {t.slogan && <p className="mt-1 text-sm text-zinc-500">{t.slogan}</p>}
            {t.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600">{t.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Users size={14} />
                {t.memberCount}/{t.sizeLimit} 人
              </span>
              <span className="inline-flex items-center gap-1">
                <CrownSimple size={14} />
                队长：{t.leader?.name}
              </span>
              {t.targetCompetition && <span>目标：{t.targetCompetition}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!data.isMember && t.recruiting && !data.hasPendingApplication && (
              <Button onClick={() => setShowApply(true)}>
                <Plus size={15} />
                申请加入
              </Button>
            )}
            {data.hasPendingApplication && (
              <span className="rounded-[10px] bg-amber-50 px-3 py-2 text-sm text-amber-600">
                申请待审批
              </span>
            )}
            {data.isMember && !data.isLeader && (
              <Button variant="outline" onClick={leaveTeam}>
                <SignOut size={15} />
                退出团队
              </Button>
            )}
            {data.isLeader && (
              <>
                <Button variant="outline" onClick={toggleRecruiting}>
                  {t.recruiting ? '关闭招募' : '开启招募'}
                </Button>
                <Button variant="outline" onClick={() => setShowEdit(true)}>
                  编辑团队
                </Button>
                <Button variant="danger" onClick={disband}>
                  <TrashSimple size={15} />
                  解散团队
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 审批申请（队长） */}
      {data.isLeader && pendingApps.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">
            入队申请（{pendingApps.length}）
          </h2>
          <div className="flex flex-col gap-3">
            {pendingApps.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[10px] bg-zinc-50 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-zinc-500 ring-1 ring-zinc-200">
                  {a.user.name?.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-800">{a.user.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    @{a.user.username}
                    {a.user.department ? ` · ${a.user.department}` : ''}
                    {a.message ? ` · ${a.message}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="!px-3 !py-1.5 !text-xs" onClick={() => review(a.id, true)}>
                    <Check size={13} />
                    通过
                  </Button>
                  <Button variant="ghost" className="!px-3 !py-1.5 !text-xs text-red-500 hover:bg-red-50" onClick={() => review(a.id, false)}>
                    <X size={13} />
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 成员 */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">团队成员</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500">
                {m.user.name?.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-800">
                  {m.user.name}
                  {m.role === 'LEADER' && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-brand-600">
                      <CrownSimple size={12} weight="fill" />
                      队长
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-400">@{m.user.username}</p>
              </div>
              {data.isLeader && m.role !== 'LEADER' && (
                <button
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  title="移除成员"
                  onClick={() => removeMember(m.user.id, m.user.name)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 项目空间 */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">团队项目空间</h2>
          {data.isMember && (
            <Link to={`/repos?teamId=${t.id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              <Plus size={13} className="mr-1 inline" />
              新建项目空间
            </Link>
          )}
        </div>
        {data.repos.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            还没有项目空间，为团队的项目建一个吧
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.repos.map((r) => (
              <Link
                key={r.id}
                to={`/repos/${r.id}`}
                className="flex items-center gap-2.5 rounded-[10px] border border-zinc-200 px-3.5 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <GitFork size={17} className="shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">{r.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {r.language ?? '未知语言'} · {r.visibility === 'PUBLIC' ? '公开' : '私有'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {showApply && (
        <ApplyModal
          onClose={() => setShowApply(false)}
          onSubmit={apply}
        />
      )}

      {showEdit && (
        <EditTeamModal
          team={t}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ApplyModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (message: string) => Promise<void> }) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">申请加入团队</h2>
        <p className="mt-1 text-sm text-zinc-400">写一段自我介绍，让队长更快了解你</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="例如：我是大二计算机专业，熟悉 Python，刷过 300 道算法题…"
          className="mt-4 w-full rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400"
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={async () => {
              setSaving(true);
              await onSubmit(message);
              setSaving(false);
            }}
            disabled={saving}
          >
            {saving ? '提交中…' : '提交申请'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditTeamModal({ team, onClose, onSaved }: { team: NonNullable<TeamDetail['team']>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: team.name,
    slogan: team.slogan ?? '',
    description: team.description ?? '',
    targetCompetition: team.targetCompetition ?? '',
    sizeLimit: team.sizeLimit,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.name.trim()) {
      setError('请填写团队名称');
      return;
    }
    setSaving(true);
    try {
      await request(`/api/teams/${team.id}`, { method: 'PUT', body: form });
      toast('团队已更新', 'success');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">编辑团队</h2>
        <div className="mt-4 flex flex-col gap-3.5 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">团队名称</span>
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">口号</span>
            <TextInput value={form.slogan} onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">介绍</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">目标竞赛</span>
            <TextInput value={form.targetCompetition} onChange={(e) => setForm((f) => ({ ...f, targetCompetition: e.target.value }))} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">人数上限</span>
            <select
              value={form.sizeLimit}
              onChange={(e) => setForm((f) => ({ ...f, sizeLimit: Number(e.target.value) }))}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {[2, 3, 4, 5, 6, 8, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n} 人
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
