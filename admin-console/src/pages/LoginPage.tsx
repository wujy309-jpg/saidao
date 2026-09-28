import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { MAIN_SITE_URL } from '../lib/api';
import { Button, TextInput } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入账号与密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <span className="text-base font-bold">赛</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">赛道 · 运营管理后台</h1>
            <p className="text-xs text-zinc-500">Token 商业化 · 仅限管理员登录</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-lift)]"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">管理员账号</span>
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </label>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">密码</span>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-5 w-full">
            <SignIn size={16} />
            {loading ? '登录中…' : '进入运营后台'}
          </Button>

          <p className="mt-4 text-center text-xs text-zinc-400">
            与主站账号互通，仅 ADMIN 角色可进入
          </p>
        </form>

        <a
          href={MAIN_SITE_URL}
          className="mt-5 block text-center text-xs text-zinc-500 hover:text-zinc-300"
        >
          ← 回到主站
        </a>
      </div>
    </div>
  );
}
