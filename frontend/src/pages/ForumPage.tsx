import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookmarkSimple,
  ChatCircleDots,
  Eye,
  GraduationCap,
  Heart,
  MagnifyingGlass,
  PushPin,
  Plus,
  Star,
  Trophy,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { FORUM_BOARDS, forumBoardName } from '../lib/labels';
import type { Competition, ForumBoard, ForumPost, Team, UserIdentity, UserProfile } from '../lib/types';
import { Button, Card, EmptyState, Field, Skeleton, TextInput } from '../components/ui';

export default function ForumPage() {
  const [params, setParams] = useSearchParams();
  const [board, setBoard] = useState<ForumBoard | ''>((params.get('board') as ForumBoard) || '');
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [keyword, setKeyword] = useState('');
  const [essenceOnly, setEssenceOnly] = useState(false);
  const [scope, setScope] = useState<'all' | 'school'>('all');
  const [mySchool, setMySchool] = useState('');
  const [identities, setIdentities] = useState<Record<number, UserIdentity>>({});
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(Boolean(params.get('share')));
  const [prefill, setPrefill] = useState<{
    board: ForumBoard;
    competitionId: number | null;
  }>({
    board: (params.get('board') as ForumBoard) || 'GENERAL',
    competitionId: params.get('competition') ? Number(params.get('competition')) : null,
  });

  const compName = useMemo(() => {
    const m: Record<number, string> = {};
    competitions.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [competitions]);

  useEffect(() => {
    request<UserProfile>('/api/profile')
      .then((p) => setMySchool(p?.school ?? ''))
      .catch(() => setMySchool(''));
  }, []);

  useEffect(() => {
    request<Competition[]>('/api/competitions')
      .then((d) => setCompetitions(d ?? []))
      .catch(() => setCompetitions([]));
    request<Team[]>('/api/teams/mine')
      .then((d) => setMyTeams(d ?? []))
      .catch(() => setMyTeams([]));
  }, []);

  useEffect(() => {
    request<ForumPost[]>('/api/forum/posts', {
      params: {
        board: board || '',
        sort,
        keyword,
        essence: essenceOnly ? 'true' : '',
        scope,
      },
    })
      .then((d) => {
        setPosts(d ?? []);
        // 校区模式:批量拉取作者学校
        if (scope === 'school' && d && d.length > 0) {
          const ids = [...new Set(d.map((p) => p.author?.id).filter(Boolean))] as number[];
          request<Record<number, UserIdentity>>(`/api/profile/batch?ids=${ids.join(',')}`)
            .then((r) => setIdentities(r ?? {}))
            .catch(() => undefined);
        }
      })
      .catch(() => setPosts([]));
  }, [board, sort, keyword, essenceOnly, scope]);

  const closeCreate = () => {
    setShowCreate(false);
    // 清理分享入口参数
    if (params.get('share') || params.get('competition')) {
      setParams({}, { replace: true });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">论坛</h1>
          <p className="mt-1 text-sm text-zinc-400">找队友、问赛题、聊经验，竞赛路上不孤单</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={15} />
          发帖
        </Button>
      </div>

      {/* 板块 tab + 排序 + 搜索 */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setBoard('')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all active:translate-y-[1px] ${
              board === ''
                ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(5,150,105,.3)]'
                : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-brand-300 hover:text-brand-700'
            }`}
          >
            全部
          </button>
          {FORUM_BOARDS.map((b) => (
            <button
              key={b.code}
              onClick={() => setBoard(b.code)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all active:translate-y-[1px] ${
                board === b.code
                  ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgba(5,150,105,.3)]'
                  : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-brand-300 hover:text-brand-700'
              }`}
            >
              {b.name}
            </button>
          ))}
          <button
            onClick={() => setEssenceOnly(!essenceOnly)}
            className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all active:translate-y-[1px] ${
              essenceOnly
                ? 'bg-amber-500 text-white shadow-[0_2px_8px_rgba(180,83,9,.3)]'
                : 'bg-white text-amber-600 ring-1 ring-amber-200 hover:bg-amber-50'
            }`}
          >
            <Star size={13} weight={essenceOnly ? 'fill' : 'regular'} />
            精华
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full bg-zinc-200/70 p-0.5">
              <button
                onClick={() => setScope('all')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  scope === 'all' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'
                }`}
              >
                总论坛
              </button>
              <button
                onClick={() => setScope('school')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  scope === 'school'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-brand-700'
                }`}
              >
                <GraduationCap size={13} weight={scope === 'school' ? 'fill' : 'regular'} />
                {scope === 'school' && mySchool ? mySchool : '校区'}
              </button>
            </div>
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索帖子 / 竞赛名"
                className="h-9 w-44 rounded-[12px] border border-emerald-900/10 bg-white pl-8 pr-2.5 text-xs placeholder:text-zinc-400 focus:border-brand-400"
              />
            </div>
            <div className="flex rounded-full bg-zinc-200/70 p-0.5">
              {(
                [
                  ['latest', '最新'],
                  ['hot', '热门'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setSort(v)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    sort === v ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 帖子列表 */}
      {posts === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : posts.length === 0 && scope === 'school' && !mySchool ? (
        <EmptyState
          title="先填写你的学校"
          description="校区模式只展示本校同学的帖子,填写学校后即可看到本校招募与经验。"
          action={
            <Link
              to="/profile"
              className="rounded-[12px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              去完善画像
            </Link>
          }
        />
      ) : posts.length === 0 && scope === 'school' ? (
        <EmptyState
          title="本校还没有帖子"
          description="来发第一帖:招募本校队友、分享参赛经验,同学们都在等你。"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              发帖
            </Button>
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState
          title={keyword ? '没有找到相关帖子' : '这个板块还没有帖子'}
          description={keyword ? '换个关键词试试' : '发第一帖，把你的问题或经验分享给大家。'}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={15} />
              发帖
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {posts.map((p) => (
            <Link
              key={p.id}
              to={`/forum/posts/${p.id}`}
              className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-zinc-50"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500">
                {p.author?.name?.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                    {forumBoardName(p.board)}
                  </span>
                  {p.pinned && (
                    <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-500 ring-1 ring-red-200">
                      <PushPin size={11} weight="fill" />
                      置顶
                    </span>
                  )}
                  {p.essence && (
                    <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                      <Star size={11} weight="fill" />
                      精华
                    </span>
                  )}
                  <span className="truncate text-[15px] font-medium text-zinc-900">{p.title}</span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                  <span>{p.author?.name}</span>
                  {scope === 'school' && p.author?.id != null && identities[p.author.id]?.school && (
                    <span className="flex items-center gap-0.5 font-semibold text-brand-700">
                      <GraduationCap size={11} />
                      {identities[p.author.id]?.school}
                    </span>
                  )}
                  <span>· {p.createdAt?.replace('T', ' ').slice(0, 16)}</span>
                  {p.competitionId != null && compName[p.competitionId] && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                      <Trophy size={11} />
                      {compName[p.competitionId]}
                    </span>
                  )}
                  {p.team && <span className="font-medium text-brand-600">团队：{p.team.name}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Eye size={14} />
                  {p.viewCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart size={14} className={p.liked ? 'text-rose-500' : ''} weight={p.liked ? 'fill' : 'regular'} />
                  {p.likeCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookmarkSimple size={14} className={p.favorited ? 'text-brand-600' : ''} weight={p.favorited ? 'fill' : 'regular'} />
                  {p.favoriteCount ?? 0}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ChatCircleDots size={14} />
                  {p.replyCount ?? 0}
                </span>
              </div>
            </Link>
          ))}
        </Card>
      )}

      {showCreate && (
        <CreatePostModal
          myTeams={myTeams}
          competitions={competitions}
          initialBoard={prefill.board}
          initialCompetitionId={prefill.competitionId}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            toast('发布成功', 'success');
            request<ForumPost[]>('/api/forum/posts', {
              params: { board: board || '', sort, keyword },
            })
              .then((d) => setPosts(d ?? []))
              .catch(() => setPosts([]));
          }}
        />
      )}
    </div>
  );
}

function CreatePostModal({
  myTeams,
  competitions,
  initialBoard,
  initialCompetitionId,
  onClose,
  onCreated,
}: {
  myTeams: Team[];
  competitions: Competition[];
  initialBoard: ForumBoard;
  initialCompetitionId: number | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [board, setBoard] = useState<ForumBoard>(initialBoard);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [teamId, setTeamId] = useState('');
  const [competitionId, setCompetitionId] = useState<string>(
    initialCompetitionId ? String(initialCompetitionId) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiAction, setAiAction] = useState<'polish' | 'expand' | 'suggest' | null>(null);

  const aiPolish = async (mode: 'polish' | 'expand') => {
    if (!content.trim()) {
      setError('先写点内容再让 AI 帮忙');
      return;
    }
    setAiAction(mode);
    setError('');
    try {
      const r = await request<{ text: string }>('/api/forum/ai/polish', {
        method: 'POST',
        body: { content, mode },
      });
      setContent(r.text);
      toast(mode === 'polish' ? 'AI 润色完成' : 'AI 扩写完成', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI 处理失败', 'error');
    } finally {
      setAiAction(null);
    }
  };

  const aiSuggest = async () => {
    if (!title.trim() && !content.trim()) {
      setError('先写点标题或内容');
      return;
    }
    setAiAction('suggest');
    setError('');
    try {
      const r = await request<{ board: string; competitionId: number | null; competitionName?: string | null }>(
        '/api/forum/ai/suggest',
        { method: 'POST', body: { title, content } }
      );
      if (['TEAM_FIND', 'Q_AND_A', 'EXPERIENCE', 'GENERAL'].includes(r.board)) {
        setBoard(r.board as ForumBoard);
      }
      if (r.competitionId != null) {
        setCompetitionId(String(r.competitionId));
        toast(`已建议板块与竞赛:${r.competitionName ?? ''}`, 'success');
      } else {
        toast('已建议板块', 'success');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '建议失败', 'error');
    } finally {
      setAiAction(null);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }
    if (!content.trim()) {
      setError('请填写内容');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await request<ForumPost>('/api/forum/posts', {
        method: 'POST',
        body: {
          board,
          title: title.trim(),
          content,
          teamId: teamId ? Number(teamId) : null,
          competitionId: competitionId ? Number(competitionId) : null,
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise">
        <h2 className="text-lg font-semibold text-zinc-900">
          {initialCompetitionId ? '分享参赛经验' : '发布帖子'}
        </h2>
        <div className="mt-4 flex flex-col gap-4 overflow-y-auto">
          <Field label="板块">
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value as ForumBoard)}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {FORUM_BOARDS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} · {b.desc}
                </option>
              ))}
            </select>
          </Field>
          <Field label="关联竞赛（选填）" hint="关联后帖子会展示在对应竞赛详情页">
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">不关联</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="标题" error={error}>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话说清楚主题" autoFocus />
          </Field>
          {board === 'TEAM_FIND' && myTeams.length > 0 && (
            <Field label="关联团队（选填）" hint="挂靠你的团队，招募更有指向性">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">不关联</option>
                {myTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="内容">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              placeholder="展开说说…"
              className="rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => aiPolish('polish')}
                disabled={aiAction !== null}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
              >
                {aiAction === 'polish' ? '润色中…' : '✨ AI 润色'}
              </button>
              <button
                type="button"
                onClick={() => aiPolish('expand')}
                disabled={aiAction !== null}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
              >
                {aiAction === 'expand' ? '扩写中…' : '📝 AI 扩写'}
              </button>
              <button
                type="button"
                onClick={aiSuggest}
                disabled={aiAction !== null}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100 disabled:opacity-50"
              >
                {aiAction === 'suggest' ? '分析中…' : '🤖 AI 建议板块与竞赛'}
              </button>
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '发布中…' : '发布'}
          </Button>
        </div>
      </div>
    </div>
  );
}
