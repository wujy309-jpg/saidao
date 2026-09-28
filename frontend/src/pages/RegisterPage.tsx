import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkle } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { toast } from '../lib/api';
import { Button, Field, TextInput } from '../components/ui';

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromOnboarding = Boolean(
    (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding
  );
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirm: '',
    name: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await register({
        username: form.username,
        password: form.password,
        name: form.name,
        email: form.email,
      });
      // 注册后自动登录;若带着游客问卷,登录过程会自动保存画像
      await login(form.username, form.password);
      toast('注册成功,正在为你生成推荐…', 'success');
      navigate('/', { state: { fresh: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6 py-10">
      <div className="w-full max-w-md animate-rise">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600"
        >
          <ArrowLeft size={15} />
          返回首页
        </Link>

        <div className="rounded-[var(--radius-card)] border border-zinc-200/80 bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">创建学生账号</h1>
          <p className="mt-1.5 text-sm text-zinc-400">注册后完成画像问卷，即可获得竞赛推荐</p>

          {fromOnboarding && (
            <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-brand-50 px-3.5 py-3 text-sm text-brand-800 ring-1 ring-brand-200">
              <Sparkle size={16} className="mt-0.5 shrink-0 text-brand-600" />
              <span>你的问卷已暂存,注册后将自动保存画像并生成专属推荐</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
            <Field label="姓名">
              <TextInput
                value={form.name}
                onChange={set('name')}
                placeholder="你的真实姓名"
                required
              />
            </Field>
            <Field label="用户名">
              <TextInput
                value={form.username}
                onChange={set('username')}
                placeholder="3-50 位，用于登录"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="密码" hint="至少 6 位">
              <TextInput
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="设置登录密码"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="确认密码">
              <TextInput
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="再次输入密码"
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="邮箱（选填）">
              <TextInput
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="用于接收竞赛提醒"
              />
            </Field>

            {error && (
              <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="mt-1 w-full py-2.5">
              {loading ? '注册中…' : '注册'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
