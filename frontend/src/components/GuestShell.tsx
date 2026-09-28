import { Link, Outlet } from 'react-router-dom';
import { Sparkle, Users, ChatCircleDots } from '@phosphor-icons/react';

/** 游客页外壳:顶部品牌栏 + 登录/注册入口 */
export default function GuestShell() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="sticky top-0 z-20 border-b border-emerald-900/8 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="checker-mark h-8 w-8 rounded-[9px] shadow-[var(--shadow-card)]">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="text-[15px] font-extrabold tracking-wide text-zinc-900">赛道</span>
            <span className="hidden text-xs text-zinc-400 sm:inline">找到你的赛道</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/competitions"
              className="rounded-[10px] px-3 py-1.5 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            >
              竞赛库
            </Link>
            <Link
              to="/login"
              className="rounded-[10px] px-3 py-1.5 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            >
              登录
            </Link>
            <Link
              to="/register"
              className="rounded-[12px] bg-brand-600 px-3.5 py-1.5 font-semibold text-white shadow-[0_2px_8px_rgba(5,150,105,.3)] hover:bg-brand-700"
            >
              免费注册
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-zinc-400 md:px-8">
        赛道 · 大学生竞赛一站式平台:画像推荐 / 竞赛库 / 组队 / 项目空间 / 论坛
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: Sparkle,
    title: 'AI 画像推荐',
    desc: '5 分钟问卷,AI 按学科、年级、技能与目标推荐最匹配的比赛,附匹配度与理由',
  },
  {
    icon: Users,
    title: '组队与协作',
    desc: '团队广场找人组队,队长审批;项目空间共享代码、PPT 与文档,协作参赛',
  },
  {
    icon: ChatCircleDots,
    title: '社区与备赛',
    desc: '论坛找队友、问答、经验分享;AI 备赛计划分阶段打卡,赛程日历不错过截止',
  },
];

export { FEATURES };
