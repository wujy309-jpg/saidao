import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Medal, Sparkle } from '@phosphor-icons/react';
import { request } from '../lib/api';
import { CATALOG_META, FORMAT_META } from '../lib/labels';
import { deadlineText, isDeadlineSoon } from '../lib/dates';
import type { Competition } from '../lib/types';
import { Card, CategoryBadge, LevelBadge } from '../components/ui';
import { FEATURES } from '../components/GuestShell';

export default function GuestHomePage() {
  const [hot, setHot] = useState<Competition[] | null>(null);

  useEffect(() => {
    request<Competition[]>('/api/competitions')
      .then((d) => setHot((d ?? []).slice(0, 6)))
      .catch(() => setHot([]));
  }, []);

  return (
    <div className="animate-rise">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900 px-4 pb-16 pt-16 text-white md:px-8 md:pb-20 md:pt-20">
        {/* 起跑格纹氛围块 */}
        <div
          className="pointer-events-none absolute right-[6%] top-[12%] hidden h-44 w-44 rotate-[-6deg] rounded-[18px] opacity-15 md:block"
          style={{
            backgroundImage:
              'conic-gradient(#fff 0 25%, transparent 25% 50%, #fff 50% 75%, transparent 75%)',
            backgroundSize: '50px 50px',
          }}
        />
        {/* 速度线 */}
        <div className="speedlines pointer-events-none absolute inset-x-0 bottom-8 h-0.5 opacity-35">
          <i style={{ left: '10%', width: '30%' }} />
          <i style={{ left: '46%', width: '22%', top: '14px' }} />
          <i style={{ left: '72%', width: '16%', top: '28px' }} />
        </div>
        <div className="mx-auto max-w-6xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-brand-100 ring-1 ring-white/15">
            <Sparkle size={13} />
            覆盖工科 · 理科 · 文科 · 综合
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.2] tracking-tight md:text-5xl">
            5 分钟画像,
            <br />
            找到真正适合你的<span className="text-brand-300">赛道</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-brand-100/85">
            不知道打什么比赛?完成一份画像问卷,AI 根据你的学科、年级、技能与目标,从竞赛库中推荐最匹配的比赛,
            附匹配度与推荐理由。还支持组队、项目协作与备赛计划。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-[12px] bg-white px-5 py-2.5 text-sm font-bold text-brand-900 transition-transform hover:scale-[1.02]"
            >
              开始画像问卷
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/competitions"
              className="inline-flex items-center gap-1.5 rounded-[12px] bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
            >
              先逛逛竞赛库
            </Link>
          </div>
          <p className="mt-4 text-xs text-brand-200/70">
            无需注册即可先做问卷,登录后自动生成推荐
          </p>
        </div>
      </section>

      {/* 功能亮点 */}
      <section className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="-mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50 text-brand-600">
                <f.icon size={20} />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 热门竞赛预览 */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">热门高含金量竞赛</h2>
            <p className="mt-1 text-sm text-zinc-400">精选 88 个竞赛,报名时间与截止提醒一目了然</p>
          </div>
          <Link to="/competitions" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            查看全部 →
          </Link>
        </div>

        {hot === null ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[var(--radius-card)] bg-zinc-200/70" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hot.map((c) => (
              <Link key={c.id} to={`/competitions/${c.id}`}>
                <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={c.category} />
                    <LevelBadge level={c.level} />
                    {c.catalogList && CATALOG_META[c.catalogList] && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CATALOG_META[c.catalogList].badge}`}
                      >
                        {CATALOG_META[c.catalogList].label}
                      </span>
                    )}
                    {c.baoyanBonus && (
                      <span className="flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 ring-1 ring-rose-200">
                        <Medal size={11} weight="fill" />
                        保研加分
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 line-clamp-1 text-[15px] font-semibold text-zinc-900">
                    {c.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {c.description}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-zinc-400">
                    <span>{FORMAT_META[c.format]}</span>
                    {c.registrationEnd && (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isDeadlineSoon(c.registrationEnd) ? 'font-medium text-red-500' : ''
                        }`}
                      >
                        <Clock size={13} />
                        {deadlineText(c.registrationEnd)}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
