import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowCounterClockwise,
  CheckCircle,
  ImageSquare,
  Info,
  SpinnerGap,
} from '@phosphor-icons/react';
import { request, uploadRequest, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AVATAR_PRESETS } from '../lib/avatars';
import { NAME_MAX, normalizeNickname, validateNickname } from '../lib/nickname';
import { levelOf } from '../lib/reputation';
import type { AccountDTO } from '../types';
import { Avatar } from '../components/Avatar';
import { PasswordCard } from '../components/PasswordCard';
import { Button, Card, Field, Skeleton, TextInput } from '../components/ui';

/** 与后端 AvatarService.MAX_BYTES 一致 */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * 账号设置：换头像（上传 / 预设 / 恢复默认）、改昵称、看账号信息、改密码。
 *
 * <p>所有写操作都返回最新的账号视图，这里统一走 {@link applyAccount} 回写本地登录态，
 * 顶部导航的头像与昵称因此会立刻跟着变——「保存了却看不出变化」是这类功能最容易踩的坑。
 */
export default function SettingsPage() {
  const { updateUser } = useAuth();
  const [account, setAccount] = useState<AccountDTO | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    request<AccountDTO>('/api/account/me')
      .then((d) => {
        setAccount(d);
        setName(d?.name ?? '');
      })
      .catch(() => setAccount(null));
  }, []);

  /** 写操作统一出口：同步页面状态 + 同步登录态（顶栏） */
  const applyAccount = (next: AccountDTO) => {
    setAccount(next);
    setName(next.name ?? '');
    updateUser({
      name: next.name,
      avatarUrl: next.avatarUrl ?? null,
      reputation: next.reputation ?? undefined,
    });
  };

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 先清空 input：否则连续选同一个文件不会触发 change
    event.target.value = '';
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      toast('请选择图片文件（PNG / JPG / GIF / BMP）', 'error');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast('图片不能超过 2MB,请压缩后再上传', 'error');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const next = await uploadRequest<AccountDTO>('/api/account/avatar', form);
      applyAccount(next);
      toast('头像已更新', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '头像上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const usePreset = async (presetId: string) => {
    setUploading(true);
    try {
      const next = await request<AccountDTO>('/api/account/avatar/preset', {
        method: 'PUT',
        body: { presetId },
      });
      applyAccount(next);
      toast('已换上预设头像', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '更换失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const resetAvatar = async () => {
    setUploading(true);
    try {
      const next = await request<AccountDTO>('/api/account/avatar', { method: 'DELETE' });
      applyAccount(next);
      toast('已恢复默认头像', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    const error = validateNickname(name);
    if (error) {
      toast(error, 'error');
      return;
    }
    setSavingName(true);
    try {
      const next = await request<AccountDTO>('/api/account/name', {
        method: 'PUT',
        body: { name: normalizeNickname(name) },
      });
      applyAccount(next);
      toast('昵称已更新', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '昵称保存失败', 'error');
    } finally {
      setSavingName(false);
    }
  };

  if (account === undefined) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentAvatar = account?.avatarUrl ?? null;
  const nameError = name ? validateNickname(name) : undefined;
  const nameChanged = Boolean(account) && normalizeNickname(name) !== account?.name;
  const level = levelOf(account?.reputation ?? undefined);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">账号设置</h1>
        <p className="mt-1 text-sm text-zinc-400">
          头像与昵称会展示在论坛、团队与项目空间里,是队友认识你的第一印象
        </p>
      </div>

      {/* 头像 */}
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="relative">
            <Avatar name={account?.name} avatarUrl={currentAvatar} size={88} />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/45 text-white">
                <SpinnerGap size={22} className="animate-spin" />
              </span>
            )}
          </div>
          <div className="min-w-[220px] flex-1">
            <h2 className="text-sm font-semibold text-zinc-800">头像</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              支持 PNG / JPG / GIF / BMP,不超过 2MB;系统会自动居中裁剪成正方形
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                <ImageSquare size={15} />
                {uploading ? '处理中…' : '上传图片'}
              </Button>
              <Button variant="outline" onClick={resetAvatar} disabled={uploading || !currentAvatar}>
                <ArrowCounterClockwise size={15} />
                恢复默认
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/bmp,image/*"
              className="hidden"
              onChange={onPickFile}
            />
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium text-zinc-500">或者选一个系统预设</p>
          <div className="mt-3 grid grid-cols-5 gap-3 sm:grid-cols-10">
            {AVATAR_PRESETS.map((preset) => {
              const active = currentAvatar === `preset:${preset.id}`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  disabled={uploading}
                  onClick={() => usePreset(preset.id)}
                  className={`flex flex-col items-center gap-1 rounded-[10px] p-1.5 transition-colors disabled:opacity-60 ${
                    active ? 'bg-brand-50 ring-1 ring-brand-300' : 'hover:bg-zinc-50'
                  }`}
                >
                  <Avatar avatarUrl={`preset:${preset.id}`} name={preset.label} size={34} />
                  <span className={`text-[10px] ${active ? 'text-brand-700' : 'text-zinc-400'}`}>
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 昵称 */}
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">昵称</h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {NAME_MAX} 个字符以内;登录用户名「{account?.username}」不可修改,昵称才是别人看到的名字
          </p>
        </div>
        <Field label="展示昵称" error={name ? nameError : undefined}>
          <div className="flex items-center gap-2">
            <TextInput
              value={name}
              maxLength={NAME_MAX * 2}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameChanged && !nameError) saveName();
              }}
              placeholder="例如:爱打比赛的阿伟"
              className="flex-1"
            />
            <span className="w-12 shrink-0 text-right text-xs text-zinc-400">
              {Array.from(normalizeNickname(name)).length}/{NAME_MAX}
            </span>
          </div>
        </Field>

        {/* 先看效果再保存:社区里到底长什么样 */}
        <div className="rounded-[10px] bg-canvas p-3">
          <p className="mb-2 text-xs text-zinc-400">效果预览</p>
          <div className="flex items-center gap-2">
            <Avatar
              name={normalizeNickname(name) || account?.name}
              avatarUrl={currentAvatar}
              size={32}
            />
            <span className="text-left leading-tight">
              <span className="block text-xs font-semibold text-zinc-800">
                {normalizeNickname(name) || account?.name}
              </span>
              <span className="block text-[10px] text-zinc-400">
                {account?.role === 'ADMIN' ? '管理员' : `${level.name} · 声望 ${account?.reputation ?? 0}`}
              </span>
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setName(account?.name ?? '')}
            disabled={!nameChanged || savingName}
          >
            重置
          </Button>
          <Button onClick={saveName} disabled={!nameChanged || Boolean(nameError) || savingName}>
            {savingName ? '保存中…' : '保存昵称'}
          </Button>
        </div>
      </Card>

      {/* 账号信息 */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-800">账号信息</h2>
          {account?.verified && (
            <span className="flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
              <CheckCircle size={12} weight="fill" />
              已认证
            </span>
          )}
        </div>
        <InfoRow label="登录用户名" value={account?.username ?? '-'} hint="用于登录,不可修改" />
        <InfoRow label="角色" value={account?.role === 'ADMIN' ? '管理员' : '学生'} />
        <InfoRow label="邮箱" value={account?.email || '未填写'} />
        <InfoRow label="学校" value={account?.school || '未填写'} hint="在「我的画像」里补充" />
        <InfoRow label="社区声望" value={`${account?.reputation ?? 0}（${level.name}）`} />
        <InfoRow
          label="注册时间"
          value={account?.createdAt ? account.createdAt.replace('T', ' ').slice(0, 16) : '-'}
        />
        <div className="flex items-start gap-2 rounded-[10px] bg-zinc-50 p-3 text-xs text-zinc-500">
          <Info size={14} className="mt-0.5 shrink-0 text-zinc-400" />
          <span>
            学校、专业、技能与获奖履历属于画像信息,请到
            <Link to="/profile" className="mx-1 inline-flex items-center font-medium text-brand-700 hover:underline">
              我的画像
              <ArrowRight size={11} />
            </Link>
            维护,AI 推荐会用到这些内容。
          </span>
        </div>
      </Card>

      <PasswordCard className="" />
    </div>
  );
}

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
      <span className="w-24 shrink-0 text-sm text-zinc-400">{label}</span>
      <span className="min-w-0 flex-1 text-sm text-zinc-700">
        {value}
        {hint && <span className="ml-2 text-xs text-zinc-400">{hint}</span>}
      </span>
    </div>
  );
}
