import { useState } from 'react';
import { request, toast } from '../lib/api';
import { Button, Card, Field, TextInput } from './ui';

/** 与后端 PasswordStrengthValidator 的 SPECIAL 字符集保持一致 */
const SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/**
 * 修改密码卡片：PUT /api/auth/change-password（需登录态；改完后端会吊销全部 refresh token）。
 * 从「我的画像」页抽出来，让账号设置页与画像页共用同一份实现。
 */
export function PasswordCard({ className = 'mt-5' }: { className?: string }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const strengthError = (() => {
    if (!newPassword) return undefined;
    if (newPassword.length < 8) return '至少 8 位';
    if (!/[A-Z]/.test(newPassword)) return '需要包含大写字母';
    if (!/[a-z]/.test(newPassword)) return '需要包含小写字母';
    if (!/[0-9]/.test(newPassword)) return '需要包含数字';
    if (!SPECIAL_CHAR_PATTERN.test(newPassword)) return '需要包含特殊字符,例如 ! @ # % ^ * - _ = +';
    return undefined;
  })();
  const confirmError = confirm && confirm !== newPassword ? '两次输入的新密码不一致' : undefined;
  const canSubmit = Boolean(oldPassword && newPassword && confirm && !strengthError && !confirmError);

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await request('/api/auth/change-password', {
        method: 'PUT',
        body: { oldPassword, newPassword },
      });
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      toast('密码已修改,请用新密码重新登录其它设备', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`flex flex-col gap-5 p-6 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold text-zinc-800">修改密码</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          至少 8 位,需包含大小写字母、数字和特殊字符;修改后其它设备的登录会失效
        </p>
      </div>
      <Field label="当前密码">
        <TextInput
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </Field>
      <Field label="新密码" error={strengthError}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Field>
      <Field label="确认新密码" error={confirmError}>
        <TextInput
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit || saving}>
          {saving ? '提交中…' : '修改密码'}
        </Button>
      </div>
    </Card>
  );
}
