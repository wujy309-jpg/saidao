import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Plus } from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Repo, RepoBranch } from '../lib/types';
import { Button, Spinner } from './ui';

export interface SaveFile {
  path: string;
  content: string;
}

/** 把 AI 生成的文件存入项目空间(选仓库/分支 → 批量提交) */
export default function SaveToRepoModal({
  files,
  onClose,
  onSaved,
}: {
  files: SaveFile[];
  onClose: () => void;
  onSaved: (paths: string[]) => void;
}) {
  const { user } = useAuth();
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [repoId, setRepoId] = useState('');
  const [branches, setBranches] = useState<RepoBranch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [message, setMessage] = useState(`AI 生成:${files[0]?.path ?? '作品'}`);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    request<Repo[]>(`/api/code-repos/user/${user.id}`)
      .then((d) => {
        setRepos(d ?? []);
        if (d && d.length > 0) setRepoId(String(d[0].id));
      })
      .catch(() => setRepos([]));
  }, [user]);

  useEffect(() => {
    if (!repoId) {
      setBranches([]);
      setBranchId('');
      return;
    }
    request<RepoBranch[]>(`/api/code-repos/${repoId}/branches`)
      .then((d) => {
        setBranches(d ?? []);
        const main = d?.find((b) => b.name === 'main') ?? d?.[0];
        if (main) setBranchId(String(main.id));
      })
      .catch(() => setBranches([]));
  }, [repoId]);

  const createRepo = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const repo = await request<Repo>(
        `/api/code-repos?ownerId=${user.id}`,
        { method: 'POST', body: { name: newName.trim(), description: 'AI 生成的作品', visibility: 'PRIVATE' } }
      );
      setRepos((prev) => [...(prev ?? []), repo]);
      setRepoId(String(repo.id));
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!user || !repoId || !branchId) {
      setError('请选择仓库与分支');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await request(`/api/code-repos/${repoId}/commits`, {
        method: 'POST',
        body: {
          branchId: Number(branchId),
          message: message.trim() || 'AI 生成文件',
          description: '由 AI 竞赛助手生成',
          authorId: user.id,
          files: files.map((f) => ({ path: f.path, content: f.content })),
        },
      });
      toast(`已存入 ${files.length} 个文件`, 'success');
      onSaved(files.map((f) => f.path));
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col gap-4 rounded-[16px] bg-white p-6 shadow-2xl animate-rise">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-600">
            <FolderOpen size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900">存入项目空间</h2>
            <p className="mt-0.5 text-xs text-zinc-400">共 {files.length} 个文件,一次提交写入仓库</p>
          </div>
        </div>

        <div className="max-h-24 overflow-y-auto rounded-[10px] border border-zinc-100 bg-canvas px-3 py-2">
          {files.map((f) => (
            <p key={f.path} className="truncate font-mono text-[11px] text-zinc-500">
              {f.path}
            </p>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-zinc-700">目标仓库</span>
          <select
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
          >
            <option value="">选择仓库</option>
            {repos?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {branches.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-zinc-700">分支</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-zinc-700">或新建仓库</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="仓库名称,如:校园二手书小程序"
              className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
            />
          </label>
          <Button variant="outline" onClick={createRepo} disabled={creating || !newName.trim()} className="!px-3">
            {creating ? <Spinner className="!h-3.5 !w-3.5" /> : <Plus size={15} />}
            新建
          </Button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-zinc-700">提交说明</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-[12px] border border-zinc-300 px-3 py-2 text-sm focus:border-brand-400"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={save} disabled={saving || !repoId || !branchId}>
            {saving ? (
              <>
                <Spinner className="border-white/40 border-t-white" />
                写入中…
              </>
            ) : (
              '确认存入'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
