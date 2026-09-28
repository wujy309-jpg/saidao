import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  Heart,
  Lightning,
  Sparkle,
  ThumbsDown,
  Users,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import {
  CATEGORY_META,
  FORMAT_META,
  MATCH_DIMENSIONS,
  matchScoreTone,
} from '../lib/labels';
import { deadlineText, isDeadlineSoon } from '../lib/dates';
import type {
  MyCompetitionItem,
  RecommendationItem,
  RecommendationResponse,
  UserProfile,
} from '../lib/types';
import {
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  LevelBadge,
  Pill,
  Skeleton,
  Spinner,
  Stars,
} from '../components/ui';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mine, setMine] = useState<MyCompetitionItem[]>([]);

  const loadProfile = useCallback(async () => {
    try {
      const p = await request<UserProfile>('/api/profile');
      setProfile(p);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载失败');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const list = await request<RecommendationItem[]>('/api/recommendations');
      setItems(list ?? []);
    } catch {
      // 历史为空不阻塞页面
      setItems([]);
    }
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const list = await request<MyCompetitionItem[]>('/api/competitions/mine');
      setMine(list ?? []);
    } catch {
      setMine([]);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadHistory();
    loadMine();
  }, [loadProfile, loadHistory, loadMine]);

  // 画像保存后自动生成推荐
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh;
  useEffect(() => {
    if (fresh && profile) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, profile]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await request<RecommendationResponse>('/api/recommendations/generate', {
        method: 'POST',
      });
      setItems(res.items);
      setSummary(res.profileSummary);
      toast('推荐已更新', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '生成失败', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const toggleFavorite = async (id: number) => {
    try {
      const nowFav = await request<boolean>(`/api/competitions/${id}/favorite`, {
        method: 'POST',
      });
      setItems((prev) =>
        prev ? prev.map((i) => (i.competitionId === id ? { ...i, favorited: nowFav } : i)) : prev
      );
      loadMine();
      toast(nowFav ? '已收藏' : '已取消收藏', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const dislike = async (id: number) => {
    try {
      await request(`/api/competitions/${id}/feedback`, {
        method: 'POST',
        body: { action: 'DISLIKE' },
      });
      setItems((prev) => (prev ? prev.filter((i) => i.competitionId !== id) : prev));
      toast('已记录，重新生成后不再推荐此类比赛', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  // 加载中
  if (profile === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  // 未完成画像
  if (profile === null) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <EmptyState
          title="先完成一份画像"
          description="用 1 分钟告诉我们你的学科、年级和兴趣，AI 会为你匹配最合适的比赛。"
          action={
            <Button onClick={() => navigate('/onboarding')}>
              开始画像问卷
              <ArrowRight size={16} />
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 头部:深绿画像横幅 + 速度线 */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-brand-900 via-[#075442] to-brand-800 px-6 py-6 text-white md:px-8 md:py-7">
        <div className="speedlines pointer-events-none absolute right-[6%] top-1/2 hidden w-52 -translate-y-1/2 opacity-55 md:block">
          <i style={{ left: 0, width: '58%' }} />
          <i style={{ left: '16%', width: '36%', top: '14px' }} />
          <i style={{ left: '36%', width: '48%', top: '26px' }} />
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight md:text-[22px]">
              {summary ? `为「${summary}」定制` : '你的专属推荐'}
            </h1>
            <p className="mt-1.5 text-[13px] text-brand-100/75">
              结合画像与 {profile.discipline} 方向竞赛库,由 AI 精选 8 个最适合你的比赛
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {profile.discipline && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">
                  学科 <b className="font-bold">{profile.discipline}</b>
                </span>
              )}
              {profile.skills && profile.skills.length > 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">
                  技能 <b className="font-bold">{profile.skills.slice(0, 3).join(' / ')}</b>
                </span>
              )}
              {profile.goals && profile.goals.length > 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">
                  目标 <b className="font-bold">{profile.goals.join(' / ')}</b>
                </span>
              )}
              {profile.weeklyHours != null && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs ring-1 ring-white/20">
                  每周 <b className="font-bold">{profile.weeklyHours} 小时</b>
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              to="/profile"
              className="rounded-[12px] bg-white px-4 py-2 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-100"
            >
              修改画像
            </Link>
            <Button
              onClick={generate}
              disabled={generating}
              className="bg-brand-400 text-brand-950 hover:bg-brand-300"
            >
              {generating ? (
                <>
                  <Spinner className="border-brand-900/30 border-t-brand-900" />
                  正在生成…
                </>
              ) : (
                <>
                  <Lightning size={16} weight="fill" />
                  重新生成推荐
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 即将截止提醒 */}
      {(() => {
        const upcoming = mine.filter(
          (m) =>
            m.competition?.registrationEnd && isDeadlineSoon(m.competition.registrationEnd)
        );
        if (upcoming.length === 0) return null;
        return (
          <div className="rounded-[16px] border border-red-200 bg-red-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-red-500">
                ⏰ 即将截止
              </p>
              <Link to="/calendar" className="text-xs font-medium text-red-500 hover:text-red-600">
                查看赛程日历 →
              </Link>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {upcoming.slice(0, 6).map((m) => (
                <Link
                  key={m.competition.id}
                  to={`/competitions/${m.competition.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-red-200 transition-colors hover:bg-red-50"
                >
                  {m.competition.name}
                  <span className="font-num font-bold text-red-500">
                    {deadlineText(m.competition.registrationEnd)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 推荐列表 */}
      {generating && (items === null || items.length === 0) ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item, idx) => (
            <RecommendationCard
              key={item.competitionId}
              item={item}
              index={idx}
              onFavorite={() => toggleFavorite(item.competitionId)}
              onDislike={() => dislike(item.competitionId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="还没有推荐记录"
          description="点击上方按钮，让 AI 为你生成第一份推荐。"
          action={
            <Button onClick={generate} disabled={generating}>
              {generating ? <Spinner /> : '生成推荐'}
            </Button>
          }
        />
      )}

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
    </div>
  );
}

function RecommendationCard({
  item,
  index,
  onFavorite,
  onDislike,
}: {
  item: RecommendationItem;
  index: number;
  onFavorite: () => void;
  onDislike: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="group flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-3.5">
        {/* 匹配度分数块 */}
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? '收起匹配度拆解' : '查看匹配度拆解'}
          className={`flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[14px] border transition-colors ${
            index === 0
              ? 'border-brand-200 bg-brand-50 hover:bg-brand-100'
              : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
          }`}
        >
          <span className={`font-num text-[22px] font-bold leading-none ${matchScoreTone(item.matchScore)}`}>
            {item.matchScore}
          </span>
          <span className="mt-1 flex items-center gap-0.5 text-[10px] text-zinc-400">
            匹配度
            <CaretDown size={9} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={item.category} />
            <LevelBadge level={item.level} />
            {item.baoyanBonus && <Pill tone="red">🏅 保研加分</Pill>}
            {item.catalogList && <Pill tone="neutral">{item.catalogList}</Pill>}
          </div>
          <Link
            to={`/competitions/${item.competitionId}`}
            className="mt-2 block truncate text-[15px] font-bold text-zinc-900 hover:text-brand-700"
          >
            {item.name}
          </Link>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">{item.reason}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={onDislike}
            title="不感兴趣"
            className="rounded-[10px] p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-500"
          >
            <ThumbsDown size={17} />
          </button>
          <button
            onClick={onFavorite}
            title={item.favorited ? '取消收藏' : '收藏'}
            className={`rounded-[10px] p-2 transition-colors ${
              item.favorited
                ? 'text-rose-500'
                : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500'
            }`}
          >
            <Heart size={18} weight={item.favorited ? 'fill' : 'regular'} />
          </button>
        </div>
      </div>

      {/* 五维匹配度拆解 */}
      {expanded && item.disciplineScore !== undefined && (
        <div className="mt-4 rounded-[12px] bg-canvas p-3.5">
          <p className="mb-2.5 text-xs font-semibold text-zinc-500">为什么推荐给你</p>
          <div className="flex flex-col gap-2">
            {MATCH_DIMENSIONS.map((dim) => {
              const value = item[dim.key] ?? 0;
              return (
                <div key={dim.key} className="flex items-center gap-2.5">
                  <span className="w-14 shrink-0 text-xs text-zinc-500">{dim.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        value >= 85 ? 'bg-brand-500' : value >= 60 ? 'bg-brand-300' : 'bg-amber-400'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right font-num text-xs font-semibold text-zinc-600">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <Users size={14} />
          {FORMAT_META[item.format]}
          {item.format === 'TEAM' && item.teamSizeMax ? ` ≤${item.teamSizeMax}人` : ''}
        </span>
        <Stars value={item.difficulty} label="难度" />
        <span>
          含金量{' '}
          <span className="font-semibold text-zinc-600">{'●'.repeat(item.prestige)}</span>
        </span>
        {item.registrationEnd && (
          <span
            className={`ml-auto inline-flex items-center gap-1 ${
              isDeadlineSoon(item.registrationEnd) ? 'font-semibold text-red-500' : ''
            }`}
          >
            <CalendarBlank size={14} />
            {isDeadlineSoon(item.registrationEnd) ? (
              <>⏰ <span className="font-num">{deadlineText(item.registrationEnd)}</span></>
            ) : (
              <span className="font-num">{deadlineText(item.registrationEnd)}</span>
            )}
          </span>
        )}
      </div>
    </Card>
  );
}
