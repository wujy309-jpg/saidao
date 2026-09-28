import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowSquareUp,
  DownloadSimple,
  File,
  FileCode,
  FileImage,
  FilePdf,
  FilePpt,
  FileText,
  FileZip,
  FolderSimple,
  GitBranch,
  GitCommit,
  MagnifyingGlass,
  Plus,
  TrashSimple,
  UserPlus,
} from '@phosphor-icons/react';
import { request, toast, uploadRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Repo, RepoBranch, RepoCommit, RepoFile, RepoMember, User } from '../lib/types';
import { Button, Card, EmptyState, Field, Skeleton, TextInput } from '../components/ui';

type Tab = 'files' | 'commits' | 'members';

const ROLE_LABELS: Record<string, string> = {
  OWNER: '所有者',
  MAINTAINER: '管理员',
  DEVELOPER: '开发者',
  REPORTER: '访客',
  GUEST: '访客',
};

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 按扩展名选择文件图标 */
function FileIcon({ name, isDir }: { name?: string; isDir?: boolean }) {
  if (isDir) return <FolderSimple size={16} className="shrink-0 text-amber-500" weight="fill" />;
  const n = (name ?? '').toLowerCase();
  if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(n)) return <FileImage size={16} className="shrink-0 text-emerald-500" />;
  if (/\.pdf$/.test(n)) return <FilePdf size={16} className="shrink-0 text-rose-500" />;
  if (/\.(ppt|pptx)$/.test(n)) return <FilePpt size={16} className="shrink-0 text-orange-500" />;
  if (/\.(doc|docx|md|txt)$/.test(n)) return <FileText size={16} className="shrink-0 text-sky-500" />;
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return <FileZip size={16} className="shrink-0 text-violet-500" />;
  if (/\.(js|ts|jsx|tsx|py|java|c|cpp|go|rs|html|css|json|yml|yaml|sql|sh)$/.test(n))
    return <FileCode size={16} className="shrink-0 text-zinc-500" />;
  return <File size={16} className="shrink-0 text-zinc-400" />;
}

export default function RepoDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<RepoBranch[]>([]);
  const [branch, setBranch] = useState('');
  const [tab, setTab] = useState<Tab>('files');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [members, setMembers] = useState<RepoMember[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFile, setOpenFile] = useState<RepoFile | null>(null);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<RepoFile | null>(null);

  const loadRepo = async () => {
    if (!id) return;
    try {
      const r = await request<Repo>(`/api/code-repos/${id}`);
      setRepo(r);
      const bs = await request<RepoBranch[]>(`/api/code-repos/${id}/branches`);
      setBranches(bs ?? []);
      const defaultB = bs?.find((b) => b.name === (r.defaultBranch ?? 'main'))?.name ?? bs?.[0]?.name ?? '';
      setBranch(defaultB);
      const ms = await request<RepoMember[]>(`/api/code-repos/${id}/members`);
      setMembers(ms ?? []);
      const me = ms?.find((m) => m.user.id === user?.id)?.role ?? null;
      setMyRole(me);
    } catch (err) {
      toast(err instanceof Error ? err.message : '加载项目空间失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!id || !branch) return;
    try {
      const list = await request<RepoFile[]>(`/api/code-repos/${id}/files`, { params: { branch } });
      setFiles(list ?? []);
    } catch {
      setFiles([]);
    }
  };

  const loadCommits = async () => {
    if (!id || !branch) return;
    try {
      const b = branches.find((x) => x.name === branch);
      const list = await request<RepoCommit[]>(`/api/code-repos/${id}/commits`, {
        params: b ? { branchId: String(b.id) } : undefined,
      });
      setCommits(list ?? []);
    } catch {
      setCommits([]);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    try {
      const ms = await request<RepoMember[]>(`/api/code-repos/${id}/members`);
      setMembers(ms ?? []);
    } catch {
      setMembers([]);
    }
  };

  useEffect(() => {
    loadRepo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (branch) {
      loadFiles();
      loadCommits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, branches]);

  const viewFile = async (f: RepoFile) => {
    if (f.fileType === 'DIRECTORY') return;
    try {
      const full = await request<RepoFile>(
        `/api/code-repos/${id}/files/${encodeURIComponent(f.filePath ?? f.fileName ?? '')}`,
        { params: { branch, path: f.filePath ?? f.fileName ?? '' } }
      );
      setOpenFile(full);
    } catch (err) {
      toast(err instanceof Error ? err.message : '读取文件失败', 'error');
    }
  };

  const downloadFile = (f: RepoFile) => {
    const token = localStorage.getItem('authToken');
    const path = encodeURIComponent(f.filePath ?? f.fileName ?? '');
    const url = `/api/code-repos/${id}/files/download?branch=${encodeURIComponent(branch)}&path=${path}`;
    // 用隐藏 a 标签触发下载（带 Authorization 头）
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (!r.ok) throw new Error('下载失败');
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = f.fileName ?? 'file';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((e) => toast(e.message ?? '下载失败', 'error'));
  };

  const deleteRepo = async () => {
    if (!window.confirm(`确认删除项目空间「${repo?.name}」？所有文件与提交将一并删除，不可恢复。`)) return;
    try {
      await request<void>(`/api/code-repos/${id}`, { method: 'DELETE' });
      toast('项目空间已删除', 'success');
      navigate('/repos');
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const canManage = myRole === 'OWNER' || myRole === 'MAINTAINER' || user?.role === 'ADMIN';
  const canDelete = myRole === 'OWNER' || user?.role === 'ADMIN';

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (!repo) {
    return <p className="py-16 text-center text-sm text-zinc-400">项目空间不存在或已删除</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link to="/repos" className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
          <ArrowLeft size={15} />
          返回项目空间
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{repo.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{repo.description || '暂无描述'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowUpload(true)} disabled={!canManage}>
              <ArrowSquareUp size={15} />
              上传文件
            </Button>
            <Button variant="outline" onClick={() => setShowNewFile(true)} disabled={!canManage}>
              <Plus size={15} />
              新建文件
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={deleteRepo}>
                <TrashSimple size={15} />
                删除项目空间
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 分支选择 + 标签页 */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 rounded-[10px] border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-600">
          <GitBranch size={15} className="text-zinc-400" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="bg-transparent text-sm outline-none">
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex rounded-[10px] bg-zinc-100 p-0.5">
          {(
            [
              ['files', '文件'],
              ['commits', '提交记录'],
              ['members', '成员'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                tab === key ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-400">
          {repo.language ?? '未知语言'} · {repo.visibility === 'PUBLIC' ? '公开' : '私有'} · 我的角色：
          {myRole ? ROLE_LABELS[myRole] ?? myRole : '非成员'}
        </span>
      </div>

      {tab === 'files' &&
        (files.length === 0 ? (
          <EmptyState
            title="这个分支还没有文件"
            description="上传代码、PPT、文档等任意文件，或在线新建代码文件。"
            action={
              <div className="flex gap-2">
                <Button onClick={() => setShowUpload(true)} disabled={!canManage}>
                  <ArrowSquareUp size={15} />
                  上传文件
                </Button>
                <Button variant="outline" onClick={() => setShowNewFile(true)} disabled={!canManage}>
                  <Plus size={15} />
                  新建文件
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
            <Card className="divide-y divide-zinc-100 overflow-hidden">
              {files.map((f) => (
                <div key={f.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => viewFile(f)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    <FileIcon name={f.fileName} isDir={f.fileType === 'DIRECTORY'} />
                    <span className="truncate">{f.fileName ?? f.filePath}</span>
                    {f.fileSize !== undefined && f.fileSize > 0 && (
                      <span className="ml-auto shrink-0 text-xs text-zinc-300">{formatSize(f.fileSize)}</span>
                    )}
                  </button>
                  {f.fileType !== 'DIRECTORY' && (f.fileName ?? '').toLowerCase().endsWith('.html') && (
                    <button
                      onClick={() => viewFile(f).then(() => setPreviewFile(f))}
                      title="预览"
                      className="shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold text-brand-600 opacity-0 transition-all hover:bg-brand-50 group-hover:opacity-100"
                    >
                      预览
                    </button>
                  )}
                  {f.fileType !== 'DIRECTORY' && (
                    <button
                      onClick={() => downloadFile(f)}
                      title="下载"
                      className="shrink-0 rounded-md p-2 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100"
                    >
                      <DownloadSimple size={15} />
                    </button>
                  )}
                </div>
              ))}
            </Card>
            <Card className="min-h-[320px] overflow-hidden">
              {openFile ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
                    <span className="truncate font-mono text-xs text-zinc-400">{openFile.filePath}</span>
                    <div className="flex items-center gap-1">
                      {(openFile.fileName ?? '').toLowerCase().endsWith('.html') && (
                        <button
                          onClick={() => setPreviewFile(openFile)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50"
                        >
                          ▶ 预览
                        </button>
                      )}
                      <button
                        onClick={() => downloadFile(openFile)}
                        title="下载"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <DownloadSimple size={15} />
                      </button>
                    </div>
                  </div>
                  <pre className="flex-1 overflow-auto bg-zinc-50 p-4 font-mono text-[13px] leading-relaxed text-zinc-700">
                    {openFile.content ?? (openFile.storagePath ? '（二进制文件，点击右上角下载查看）' : '(空文件)')}
                  </pre>
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-zinc-400">
                  点击左侧文件预览内容，点下载按钮保存到本地
                </div>
              )}
            </Card>
          </div>
        ))}

      {tab === 'commits' && (
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {commits.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-zinc-400">暂无提交记录</p>
          ) : (
            commits.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <GitCommit size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">{c.message}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {typeof c.author === 'object' && c.author ? c.author.name : '未知用户'} ·{' '}
                    {c.committedAt?.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-zinc-300">{c.commitHash?.slice(0, 8)}</span>
              </div>
            ))
          )}
        </Card>
      )}

      {tab === 'members' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddMember(true)} disabled={!canManage}>
              <UserPlus size={15} />
              添加成员
            </Button>
          </div>
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {members.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-zinc-400">暂无成员</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                    {m.user.name?.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">{m.user.name}</p>
                    <p className="truncate text-xs text-zinc-400">@{m.user.username}</p>
                  </div>
                  {canManage && m.role !== 'OWNER' ? (
                    <select
                      value={m.role}
                      onChange={async (e) => {
                        try {
                          await request(`/api/code-repos/${id}/members/${m.user.id}/role`, {
                            method: 'PUT',
                            body: { role: e.target.value },
                          });
                          toast('角色已更新', 'success');
                          loadMembers();
                        } catch (err) {
                          toast(err instanceof Error ? err.message : '更新失败', 'error');
                        }
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                    >
                      {['MAINTAINER', 'DEVELOPER', 'REPORTER'].map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  )}
                  {canManage && m.role !== 'OWNER' && (
                    <button
                      className="rounded-md p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      title="移除成员"
                      onClick={async () => {
                        if (!window.confirm(`移除成员「${m.user.name}」？`)) return;
                        try {
                          await request(`/api/code-repos/${id}/members/${m.user.id}`, { method: 'DELETE' });
                          toast('成员已移除', 'success');
                          loadMembers();
                        } catch (err) {
                          toast(err instanceof Error ? err.message : '移除失败', 'error');
                        }
                      }}
                    >
                      <TrashSimple size={15} />
                    </button>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {showNewFile && (
        <NewFileModal
          branchId={branches.find((b) => b.name === branch)?.id}
          onClose={() => setShowNewFile(false)}
          onCreated={async () => {
            setShowNewFile(false);
            await loadFiles();
            await loadCommits();
            toast('文件已提交', 'success');
          }}
        />
      )}

      {previewFile && (
        <HtmlPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {showUpload && (
        <UploadModal
          branch={branch}
          onClose={() => setShowUpload(false)}
          uploading={uploading}
          onUpload={async (file, dir) => {
            setUploading(true);
            try {
              const fd = new FormData();
              fd.append('file', file);
              fd.append('branch', branch);
              fd.append('path', dir);
              fd.append('authorId', String(user?.id));
              await uploadRequest(`/api/code-repos/${id}/files/upload`, fd);
              toast('上传成功', 'success');
              setShowUpload(false);
              await loadFiles();
              await loadCommits();
            } catch (err) {
              toast(err instanceof Error ? err.message : '上传失败', 'error');
            } finally {
              setUploading(false);
            }
          }}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onAdded={async (memberId, role) => {
            try {
              await request(`/api/code-repos/${id}/members`, {
                method: 'POST',
                body: { userId: memberId, role, inviterId: user?.id },
              });
              toast('成员添加成功', 'success');
              setShowAddMember(false);
              loadMembers();
            } catch (err) {
              toast(err instanceof Error ? err.message : '添加失败', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

/* ============ 上传弹窗 ============ */

function UploadModal({
  branch,
  onClose,
  uploading,
  onUpload,
}: {
  branch: string;
  onClose: () => void;
  uploading: boolean;
  onUpload: (file: File, dir: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dir, setDir] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">上传文件</h2>
        <p className="mt-1 text-sm text-zinc-400">
          支持代码、PPT、Word、PDF、图片、压缩包等任意类型，上传到分支 {branch}
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-zinc-300 py-10 text-zinc-400 transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          <ArrowSquareUp size={28} />
          <span className="text-sm">{file ? file.name : '点击选择文件'}</span>
          {file && <span className="text-xs text-zinc-400">{formatSize(file.size)}</span>}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-4">
          <Field label="存放目录（选填）" hint="例如 docs、ppt，留空放根目录">
            <TextInput
              value={dir}
              onChange={(e) => setDir(e.target.value)}
              placeholder="docs"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            取消
          </Button>
          <Button onClick={() => file && onUpload(file, dir)} disabled={!file || uploading}>
            {uploading ? '上传中…' : '上传'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ 添加成员弹窗 ============ */

function AddMemberModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (userId: number, role: string) => Promise<void>;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [role, setRole] = useState('DEVELOPER');
  const [adding, setAdding] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    try {
      const list = await request<User[]>('/api/users/search', { params: { username: keyword } });
      setResults(list ?? []);
    } catch (err) {
      toast(err instanceof Error ? err.message : '搜索失败', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">添加成员</h2>
        <p className="mt-1 text-sm text-zinc-400">按用户名搜索同学，邀请加入团队</p>

        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <TextInput
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="输入用户名，如 student02"
              className="w-full pl-9"
            />
          </div>
          <Button variant="outline" onClick={search}>
            搜索
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-48 divide-y divide-zinc-100 overflow-y-auto rounded-[10px] border border-zinc-200">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  selected?.id === u.id ? 'bg-brand-50' : 'hover:bg-zinc-50'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                  {u.name?.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-zinc-700">{u.name}</span>
                <span className="text-xs text-zinc-400">@{u.username}</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-4">
            <Field label="角色">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="MAINTAINER">管理员（可管理文件与成员）</option>
                <option value="DEVELOPER">开发者（可上传和编辑文件）</option>
                <option value="REPORTER">访客（仅查看）</option>
              </select>
            </Field>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={adding}>
            取消
          </Button>
          <Button
            onClick={async () => {
              if (!selected) return;
              setAdding(true);
              await onAdded(selected.id, role);
              setAdding(false);
            }}
            disabled={!selected || adding}
          >
            {adding ? '添加中…' : '添加'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ 新建文件弹窗 ============ */

function NewFileModal({
  branchId,
  onClose,
  onCreated,
}: {
  branchId?: number;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { id } = useParams();
  const { user } = useAuth();
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!path.trim() || !branchId) {
      setError('请填写文件路径（如 src/main.py）');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await request<RepoCommit>(`/api/code-repos/${id}/commits`, {
        method: 'POST',
        body: {
          branchId,
          message: message || `新增 ${path}`,
          description: '',
          authorId: user?.id,
          files: [{ path: path.trim(), content, deleted: false }],
        },
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">新建文件</h2>
        <div className="mt-5 flex flex-col gap-4 overflow-y-auto">
          <Field label="文件路径" hint="例如 src/main.py">
            <TextInput
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="src/main.py"
              autoFocus
            />
          </Field>
          <Field label="提交说明（选填）">
            <TextInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="这次提交做了什么"
            />
          </Field>
          <Field label="文件内容">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="在这里写代码…"
              className="rounded-[10px] border border-zinc-300 bg-white p-3 font-mono text-[13px] placeholder:text-zinc-400"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving || !branchId}>
            {saving ? '提交中…' : '提交'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** HTML 文件在线预览弹窗(iframe 运行) */
function HtmlPreviewModal({ file, onClose }: { file: RepoFile; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl animate-rise">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 min-w-0 flex-1 truncate rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs text-zinc-500">
            preview.local/{file.fileName}
          </span>
          <button
            onClick={() => window.open(`#preview`, '_blank')}
            className="hidden"
          />
          <button
            onClick={onClose}
            className="rounded-[10px] border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100"
          >
            关闭 ✕
          </button>
        </div>
        <iframe
          title="作品预览"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          srcDoc={file.content ?? ''}
          className="h-full w-full flex-1 border-0 bg-white"
        />
        <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400">
          AI 生成的单页作品直接在此运行;若引用了外部资源可能受限,小程序(wxml)请下载后在微信开发者工具中导入。
        </p>
      </div>
    </div>,
    document.body
  );
}
