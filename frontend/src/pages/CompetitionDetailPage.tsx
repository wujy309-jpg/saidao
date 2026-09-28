import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowSquareOut,
  CalendarBlank,
  CalendarCheck,
  Heart,
  Medal,
  Robot,
  ThumbsDown,
  Trophy,
  Users,
} from '@phosphor-icons/react';
import { request, toast, isLoggedIn } from '../lib/api';
import {
  CATALOG_META,
  FORMAT_META,
  JOURNEY_STATUS_META,
  JOURNEY_STATUS_OPTIONS,
  LEVEL_META,
  WORK_TYPE_META,
} from '../lib/labels';
import { REG_PHASE_META, daysUntil, deadlineText, fmtShort, regPhase } from '../lib/dates';
import type {
  Competition,
  ExcellentWork,
  FeedbackAction,
  ForumPost,
  JourneyStatus,
  PreparationPlan,
} from '../lib/types';
import { Button, Card, CategoryBadge, LevelBadge, Skeleton, Stars } from '../components/ui';
import GeneratePlanModal from '../components/GeneratePlanModal';

interface DetailData {
  competition: Competition;
  favorited: boolean;
  status: JourneyStatus | null;
  feedback: FeedbackAction | null;
}

export default function CompetitionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState('');
  const [similar, setSimilar] = useState<Competition[]>([]);
  const [works, setWorks] = useState<ExcellentWork[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<ForumPost[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const load = () => {
    request<DetailData>(`/api/competitions/${id}`)
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  };

  useEffect(load, [id]);

  useEffect(() => {
    request<Competition[]>(`/api/competitions/${id}/similar`)
      .then((d) => setSimilar(d ?? []))
      .catch(() => setSimilar([]));
    request<ExcellentWork[]>(`/api/competitions/${id}/works`)
      .then((d) => setWorks(d ?? []))
      .catch(() => setWorks([]));
    request<ForumPost[]>(`/api/forum/posts`, {
      params: { competitionId: id ?? '', sort: 'hot' },
    })
      .then((d) => setRelatedPosts(d ?? []))
      .catch(() => setRelatedPosts([]));
  }, [id]);

  if (error) {
    return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  }
  if (!data) {
    return <Skeleton className="h-96 w-full" />;
  }

  const c = data.competition;
  const phase = regPhase(c.registrationStart, c.registrationEnd);
  const daysLeft = daysUntil(c.registrationEnd);

  const toggleFavorite = async () => {
    try {
      const now = await request<boolean>(`/api/competitions/${c.id}/favorite`, {
        method: 'POST',
      });
      setData((d) => (d ? { ...d, favorited: now } : d));
      toast(now ? '已收藏' : '已取消收藏', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const changeStatus = async (status: JourneyStatus) => {
    try {
      await request(`/api/competitions/${c.id}/status`, { method: 'PUT', body: { status } });
      toast(`已更新为「${JOURNEY_STATUS_META[status].label}」`, 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '更新失败', 'error');
    }
  };

  const sendFeedback = async (action: FeedbackAction) => {
    try {
      await request(`/api/competitions/${c.id}/feedback`, {
        method: 'POST',
        body: { action },
      });
      toast(
        action === 'DISLIKE' ? '已记录，推荐将减少此类比赛' : '已记录，推荐将增加此类比赛',
        'success'
      );
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <Link
        to="/competitions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600"
      >
        <ArrowLeft size={15} />
        返回竞赛库
      </Link>

      <Card className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
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
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
              {c.name}
            </h1>
            {c.organizer && <p className="mt-1.5 text-sm text-zinc-400">{c.organizer}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isLoggedIn() ? (
              <>
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors ${
                    data.favorited
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  <Heart size={17} weight={data.favorited ? 'fill' : 'regular'} />
                  {data.favorited ? '已收藏' : '收藏'}
                </button>
                <button
                  onClick={() => sendFeedback('DISLIKE')}
                  title="不感兴趣"
                  className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors ${
                    data.feedback === 'DISLIKE'
                      ? 'bg-zinc-200 text-zinc-600'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  <ThumbsDown size={16} />
                  不感兴趣
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                <Heart size={17} />
                登录后收藏
              </Link>
            )}
          </div>
        </div>

        {/* 报名状态横幅 */}
        {phase && (
          <div
            className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] px-4 py-3.5 ring-1 ${
              phase === 'OPEN'
                ? 'bg-emerald-50/70 ring-emerald-200'
                : phase === 'CLOSED'
                  ? 'bg-zinc-50 ring-zinc-200'
                  : 'bg-sky-50/70 ring-sky-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  phase === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-600'
                    : phase === 'CLOSED'
                      ? 'bg-zinc-200 text-zinc-500'
                      : 'bg-sky-100 text-sky-600'
                }`}
              >
                <CalendarBlank size={18} />
              </span>
              <div>
                <p className={`text-sm font-semibold ${REG_PHASE_META[phase].text}`}>
                  {REG_PHASE_META[phase].label}
                  {phase === 'OPEN' && daysLeft !== null && daysLeft <= 7 && (
                    <span className="ml-2 text-red-500">⏰ {deadlineText(c.registrationEnd)}</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  报名窗口:{fmtShort(c.registrationStart)} ~ {fmtShort(c.registrationEnd)}
                  {c.competitionDate && ` · 比赛:${c.competitionDate}`}
                </p>
              </div>
            </div>
            {phase === 'OPEN' && daysLeft !== null && daysLeft > 7 && (
              <span className="text-sm font-medium text-emerald-600">
                {deadlineText(c.registrationEnd)}
              </span>
            )}
          </div>
        )}

        {/* AI 助手入口 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-violet-200 bg-violet-50/60 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <Robot size={22} className="shrink-0 text-violet-600" weight="fill" />
            <div>
              <p className="text-sm font-medium text-zinc-800">AI 竞赛助手</p>
              <p className="text-xs text-zinc-400">
                已加载官网规则与历年优秀作品,帮你解读赛制、出方案、写计划书和答辩材料
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate(`/forum?competition=${c.id}&board=EXPERIENCE&share=1`)}
            >
              分享参赛经验
            </Button>
            <Button onClick={() => navigate(`/assistant?competition=${c.id}`)}>
              找 AI 助手帮忙
            </Button>
          </div>
        </div>

        {/* 我的参赛状态(登录后) */}
        {isLoggedIn() ? (
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[10px] bg-zinc-50 px-4 py-3">
            <span className="text-sm text-zinc-500">我的参赛状态</span>
            <div className="flex flex-wrap gap-1.5">
              {JOURNEY_STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    data.status === s
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-zinc-300'
                  }`}
                >
                  {JOURNEY_STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-zinc-50 px-4 py-3">
            <span className="text-sm text-zinc-500">收藏后可跟踪参赛状态、生成备赛计划</span>
            <Link
              to="/register"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              免费注册 →
            </Link>
          </div>
        )}

        {/* 备赛计划 */}
        {isLoggedIn() && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-brand-200 bg-brand-50/60 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <CalendarCheck size={20} className="shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-zinc-800">备赛计划</p>
                <p className="text-xs text-zinc-400">说出目标与可投入时间,AI 按比赛日期倒排阶段化计划,任务可打卡推进</p>
              </div>
            </div>
            <Button onClick={() => setShowPlanModal(true)}>
              生成备赛计划
            </Button>
          </div>
        )}

        <p className="mt-5 text-[15px] leading-relaxed text-zinc-600">{c.description}</p>

        {/* 赛制规则 */}
        {c.rules && (
          <div className="mt-6 rounded-[10px] border border-zinc-100 bg-zinc-50/70 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-500">赛制规则与评审标准</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{c.rules}</p>
          </div>
        )}

        {/* 信息网格 */}
        <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3">
          <InfoCell icon={<Trophy size={16} />} label="竞赛级别" value={LEVEL_META[c.level].label} />
          <InfoCell icon={<Users size={16} />} label="参赛形式" value={FORMAT_META[c.format]} />
          <InfoCell icon={<Users size={16} />} label="团队人数" value={c.format === 'TEAM' && c.teamSizeMax ? `最多 ${c.teamSizeMax} 人` : '个人参赛'} />
          <InfoCell
            icon={<CalendarBlank size={16} />}
            label="报名时间"
            value={
              c.registrationStart || c.registrationEnd
                ? `${c.registrationStart ?? '待定'} 至 ${c.registrationEnd ?? '待定'}`
                : '以官方通知为准'
            }
          />
          <InfoCell icon={<CalendarBlank size={16} />} label="比赛时间" value={c.competitionDate ?? '以官方通知为准'} />
          <InfoCell icon={<Trophy size={16} />} label="报名费" value={c.entryFee ?? '以官方为准'} />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">难度 / 含金量</span>
            <span className="flex items-center gap-3">
              <Stars value={c.difficulty} label="" />
              <span className="text-sm text-zinc-700">{'●'.repeat(c.prestige)}</span>
            </span>
          </div>
        </div>

        {c.disciplines && c.disciplines.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="text-xs text-zinc-400">相关学科</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.disciplines.map((d) => (
                <span key={d} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {c.tags && c.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {c.tags.map((t) => (
              <span key={t} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
                {t}
              </span>
            ))}
          </div>
        )}

        {c.officialUrl && (
          <a
            href={c.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex items-center gap-1.5 rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            访问官网
            <ArrowSquareOut size={15} />
          </a>
        )}
      </Card>

      {/* 历年优秀作品 */}
      {works.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">历年优秀作品</h2>
          <div className="flex flex-col gap-2.5">
            {works.map((w) => (
              <Card key={w.id} className="p-4.5 p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-md px-1.5 py-0.5 text-xs ${WORK_TYPE_META[w.type].badge}`}>
                    {WORK_TYPE_META[w.type].label}
                  </span>
                  {w.award && (
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                      {w.award}
                    </span>
                  )}
                  {w.year && <span className="text-xs text-zinc-400">{w.year}年</span>}
                  {w.team && <span className="text-xs text-zinc-400">{w.team}</span>}
                </div>
                <h3 className="mt-2 text-[15px] font-semibold text-zinc-900">{w.title}</h3>
                {w.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{w.description}</p>
                )}
                {w.link && (
                  <a
                    href={w.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    查看 / 下载作品
                    <ArrowSquareOut size={13} />
                  </a>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 相关经验帖 */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">社区相关帖子</h2>
          <button
            onClick={() => navigate(`/forum?competition=${c.id}&board=EXPERIENCE&share=1`)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + 分享经验
          </button>
        </div>
        {relatedPosts.length === 0 ? (
          <Card className="p-4 text-center text-xs text-zinc-400">
            还没有人分享过这个比赛的经验,来写第一帖吧
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {relatedPosts.slice(0, 5).map((p) => (
              <Link key={p.id} to={`/forum/posts/${p.id}`}>
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.essence && (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-200">
                        精华
                      </span>
                    )}
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
                      {p.board === 'EXPERIENCE' ? '经验分享' : '讨论'}
                    </span>
                    <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900">{p.title}</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    {p.author?.name} · {p.createdAt?.replace('T', ' ').slice(0, 16)} ·{' '}
                    {p.likeCount ?? 0} 赞 · {p.replyCount ?? 0} 回复
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {showPlanModal && (
        <GeneratePlanModal
          competitionId={c.id}
          competitionName={c.name}
          onClose={() => setShowPlanModal(false)}
          onGenerated={(planId) => {
            setShowPlanModal(false);
            navigate(`/plans/${planId}`);
          }}
        />
      )}

      {/* 相似比赛推荐 */}
      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800">相似比赛</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <Link key={s.id} to={`/competitions/${s.id}`}>
                <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={s.category} />
                    <LevelBadge level={s.level} />
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-zinc-900">{s.name}</h3>
                  <div className="mt-auto flex items-center gap-4 pt-3 text-xs text-zinc-400">
                    <Stars value={s.difficulty} label="难度" />
                    <span>{FORMAT_META[s.format]}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-xs text-zinc-400">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-zinc-700">{value}</span>
    </div>
  );
}
