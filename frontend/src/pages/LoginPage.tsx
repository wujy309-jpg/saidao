import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { useAuth } from '../lib/auth';
import { Button, Field, TextInput } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appliedPending = await login(username, password);
      // 若登录时应用了游客问卷画像,直接生成推荐
      navigate('/', appliedPending ? { state: { fresh: true } } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh]">
      {/* 左：品牌区 */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle at center, rgba(52,211,153,.55), transparent 65%)',
          }}
        />
        <div className="flex items-center gap-2.5">
          <span className="checker-mark h-9 w-9 rounded-[10px] shadow-lg">
            <i style={{background:'#10b981'}} />
            <i style={{background:'#fff'}} />
            <i style={{background:'#fff'}} />
            <i style={{background:'#10b981'}} />
          </span>
          <span className="text-lg font-extrabold tracking-wide">赛道</span>
        </div>

        <div>
          <p className="text-[42px] font-semibold leading-[1.15] tracking-tight">
            找到适合你的比赛
            <br />
            从一份画像开始
          </p>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-brand-100/80">
            告诉我们你的学科、年级和兴趣，AI 从竞赛库中为你挑选最匹配的比赛，附上理由和匹配度。
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-brand-200">
            <Sparkle size={16} />
            <span>覆盖工科 · 理科 · 文科 · 综合</span>
          </div>
        </div>

        <p className="text-xs text-brand-200/60">大学生竞赛一站式平台</p>
      </div>

      {/* 右：表单区 */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="checker-mark h-8 w-8 rounded-[9px]">
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="text-lg font-extrabold tracking-wide text-zinc-900">赛道</span>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">欢迎回来</h1>
          <p className="mt-1.5 text-sm text-zinc-400">登录后继续你的竞赛之旅</p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Field label="用户名">
              <TextInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="密码">
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
            </Field>

            {error && (
              <p className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="mt-1 w-full py-2.5">
              {loading ? '登录中…' : '登录'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            还没有账号？{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
              注册学生账号
            </Link>
          </p>

          <div className="mt-10 rounded-[10px] bg-zinc-100/80 px-4 py-3 text-xs leading-relaxed text-zinc-500">
            演示账号：student01 / student123（学生）
            <br />
            admin / admin123（管理员）
          </div>
        </div>
      </div>
    </div>
  );
}
