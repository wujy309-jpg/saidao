import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CaretDown,
  Coin,
  List,
  MagnifyingGlass,
  SignOut,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { request } from '../lib/api';
import { isDeadlineSoon, daysUntil } from '../lib/dates';
import { levelOf } from '../lib/reputation';
import type { MyCompetitionItem, TokenAccount } from '../lib/types';

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/assistant', label: 'AI 助手', end: false },
  { to: '/competitions', label: '竞赛库', end: false },
  { to: '/calendar', label: '赛程日历', end: false },
  { to: '/forum', label: '论坛', end: false },
  { to: '/teams', label: '团队', end: false },
  { to: '/repos', label: '项目空间', end: false },
];

const MY_MENU = [
  { to: '/favorites', label: '我的竞赛' },
  { to: '/plans', label: '备赛计划' },
  { to: '/profile', label: '我的画像' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');
  const [deadline, setDeadline] = useState<{ count: number; days: number } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refreshUnread = () => {
    if (!user) return;
    request<number>('/api/forum/notifications/unread-count')
      .then((d) => setUnread(d ?? 0))
      .catch(() => setUnread(0));
  };

  // Token 余额:登录后拉取,路由变化(消费过 AI)后刷新
  useEffect(() => {
    if (!user) return;
    let alive = true;
    request<TokenAccount>('/api/token/balance')
      .then((d) => alive && setBalance(d?.balance ?? 0))
      .catch(() => alive && setBalance(null));
    return () => {
      alive = false;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    refreshUnread();
    const handler = () => refreshUnread();
    window.addEventListener('notifications-changed', handler);
    return () => window.removeEventListener('notifications-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 截止提醒:收藏比赛中 7 天内截止的
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    request<MyCompetitionItem[]>('/api/competitions/mine')
      .then((d) => {
        const soon = (d ?? []).filter((m) => isDeadlineSoon(m.competition?.registrationEnd));
        if (soon.length > 0) {
          const days = Math.min(...soon.map((m) => daysUntil(m.competition?.registrationEnd) ?? 7));
          setDeadline({ count: soon.length, days });
        } else {
          setDeadline(null);
        }
      })
      .catch(() => setDeadline(null));
  }, [user]);

  // 点击外部关闭"我的"菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 路由变化时关闭菜单与抽屉
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
  }, [location.pathname]);

  const level = levelOf(user?.reputation);
  const myActive = ['/favorites', '/plans', '/profile'].some((p) => location.pathname.startsWith(p));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/competitions?keyword=${encodeURIComponent(q)}`);
    setSearch('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `relative whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-brand-50 font-semibold text-brand-800 after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-600'
                : 'text-zinc-500 hover:bg-brand-50/60 hover:text-brand-800'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-[100dvh]">
      {/* 顶部导航(单一导航,无侧边栏) */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/8 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-1 px-4 md:px-6">
          <Link to="/" className="mr-2 flex shrink-0 items-center gap-2">
            <span className="checker-mark h-8 w-8 rounded-[9px] shadow-[var(--shadow-card)]">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="text-[15px] font-extrabold tracking-wide text-zinc-900">赛道</span>
          </Link>

          <button
            className="rounded-[10px] p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            title="菜单"
          >
            <List size={19} />
          </button>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-0.5 lg:flex">{navLinks}</nav>

          {/* 右侧:搜索 / 截止胶囊 / 铃铛 / 用户状态 */}
          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submitSearch} className="relative hidden md:block">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索竞赛 / 帖子"
                className="h-9 w-52 rounded-[12px] border border-emerald-900/10 bg-canvas pl-8 pr-3 text-sm placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white"
              />
            </form>
            {deadline && (
              <Link
                to="/calendar"
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 ring-1 ring-red-200 hover:bg-red-100 sm:flex"
                title="收藏的比赛即将截止"
              >
                ⏰ {deadline.count} 场比赛
                <span className="font-num font-bold">{deadline.days}</span> 天后截止
              </Link>
            )}
            <button
              onClick={() => navigate('/notifications')}
              title="通知"
              className="relative rounded-[12px] border border-emerald-900/10 bg-white p-2 text-zinc-500 shadow-[var(--shadow-card)] transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            {/* Token 余额与充值入口 */}
            <Link
              to="/recharge"
              title="充值中心"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              <Coin size={15} weight="fill" className="text-brand-600" />
              <span className="font-num">
                {balance === null ? '…' : balance.toLocaleString('zh-CN')}
              </span>
              <span className="hidden text-brand-600 sm:inline">Token</span>
            </Link>
            {/* 用户状态:原「我的」模块的展开项已合并到这里 */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-zinc-100 ${
                  myActive ? 'bg-brand-50 ring-1 ring-brand-200' : ''
                }`}
                title={user?.name}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white">
                  {user?.name?.charAt(0) ?? 'U'}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold text-zinc-800">{user?.name}</span>
                  <span className="block text-[10px] text-zinc-400">
                    {user?.role === 'ADMIN' ? '管理员' : `${level.name} · 声望 ${user?.reputation ?? 0}`}
                  </span>
                </span>
                <CaretDown
                  size={12}
                  className={`hidden transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 z-40 w-48 rounded-[12px] border border-emerald-900/8 bg-white p-1.5 shadow-[var(--shadow-lift)]">
                  <div className="border-b border-zinc-100 px-3 pb-2 pt-1.5 sm:hidden">
                    <p className="text-xs font-semibold text-zinc-800">{user?.name}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      {user?.role === 'ADMIN' ? '管理员' : `${level.name} · 声望 ${user?.reputation ?? 0}`}
                    </p>
                  </div>
                  {MY_MENU.map((m) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      className={`block rounded-[8px] px-3 py-2 text-sm transition-colors ${
                        location.pathname.startsWith(m.to)
                          ? 'bg-brand-50 font-semibold text-brand-800'
                          : 'text-zinc-600 hover:bg-brand-50 hover:text-brand-800'
                      }`}
                    >
                      {m.label}
                    </Link>
                  ))}
                  {user?.role === 'ADMIN' && (
                    <a
                      href={`${import.meta.env.VITE_ROUTER_BASE || '/'}admin/`}
                      className="block rounded-[8px] px-3 py-2 text-sm text-zinc-600 hover:bg-brand-50 hover:text-brand-800"
                    >
                      管理后台
                    </a>
                  )}
                  <div className="my-1 h-px bg-zinc-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-1.5 rounded-[8px] px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <SignOut size={14} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 移动端抽屉 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <Link to="/" className="flex items-center gap-2">
                <span className="checker-mark h-8 w-8 rounded-[9px]">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="text-[15px] font-extrabold tracking-wide">赛道</span>
              </Link>
              <button
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-800' : 'text-zinc-500 hover:bg-zinc-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {user?.role === 'ADMIN' && (
                <a
                  href={`${import.meta.env.VITE_ROUTER_BASE || '/'}admin/`}
                  className="rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  管理后台
                </a>
              )}
            </nav>
            <div className="border-t border-zinc-100 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                <SignOut size={15} />
                退出登录
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
