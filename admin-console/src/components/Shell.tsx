import {
  ChartBar,
  Coin,
  CreditCard,
  GearSix,
  Package,
  Receipt,
  SignOut,
  Ticket,
  Trophy,
  Users,
} from '@phosphor-icons/react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { MAIN_SITE_URL } from '../lib/api';

const NAV = [
  { to: '/', label: '总览', icon: ChartBar, end: true },
  { to: '/users', label: '用户与余额', icon: Users },
  { to: '/transactions', label: 'Token 流水', icon: Receipt },
  { to: '/packages', label: '充值套餐', icon: Package },
  { to: '/cards', label: '卡密管理', icon: Ticket },
  { to: '/orders', label: '订单管理', icon: CreditCard },
  { to: '/scenes', label: '场景定价', icon: Coin },
  { to: '/settings', label: '平台设置', icon: GearSix },
  { to: '/competitions', label: '竞赛管理', icon: Trophy },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* 侧栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-ink text-zinc-300">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600 text-white">
            <span className="text-sm font-bold">赛</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">赛道 · 运营后台</p>
            <p className="text-[11px] text-zinc-500">Token 商业化平台</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`
              }
            >
              <item.icon size={17} weight={item.end ? 'fill' : 'regular'} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-xs font-semibold text-brand-300">
              {user?.name?.charAt(0) ?? 'A'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-zinc-500">@{user?.username}</p>
            </div>
            <button
              title="退出登录"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
            >
              <SignOut size={15} />
            </button>
          </div>
          <a
            href={MAIN_SITE_URL}
            className="mt-1 block rounded-[10px] px-3 py-2 text-center text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
          >
            ← 回到主站
          </a>
        </div>
      </aside>

      {/* 内容区 */}
      <main className="ml-56 min-w-0 flex-1 px-8 py-7">
        <Outlet />
      </main>
    </div>
  );
}
