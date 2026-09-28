import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookmarkSimple,
  CheckCircle,
  Eye,
  Heart,
  Medal,
  PushPin,
  Star,
  TrashSimple,
  Trophy,
  UserPlus,
  Users,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import { forumBoardName } from '../lib/labels';
import { levelOf } from '../lib/reputation';
import type { Competition, ForumPost, ForumReply, UserIdentity } from '../lib/types';
import { Button, Card, Skeleton } from '../components/ui';

export default function ForumPostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [following, setFollowing] = useState(false);
  const [identities, setIdentities] = useState<Record<number, UserIdentity>>({});
  const [error, setError] = useState('');

  const compName = competitions.find((c) => c.id === post?.competitionId)?.name;

  useEffect(() => {
    request<Competition[]>('/api/competitions')
      .then((d) => setCompetitions(d ?? []))
      .catch(() => setCompetitions([]));
  }, []);

  // 批量拉取作者身份信息(学校/履历/认证)
  useEffect(() => {
    const ids = new Set<number>();
    if (post?.author?.id) ids.add(post.author.id);
    replies.forEach((r) => r.author?.id && ids.add(r.author.id));
    if (ids.size === 0) return;
    request<Record<number, UserIdentity>>(`/api/profile/batch?ids=${[...ids].join(',')}`)
      .then((d) => setIdentities(d ?? {}))
      .catch(() => undefined);
  }, [post?.author?.id, replies]);

  const load = async () => {
    try {
      const p = await request<ForumPost>(`/api/forum/posts/${id}`);
      setPost(p);
      const rs = await request<ForumReply[]>(`/api/forum/posts/${id}/replies`);
      setReplies(rs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!post) return <Skeleton className="h-96 w-full" />;

  const canDelete = (authorId?: number) =>
    authorId === user?.id || user?.role === 'ADMIN';

  const togglePostLike = async () => {
    try {
      const r = await request<{ liked: boolean; likeCount: number }>(
        `/api/forum/posts/${id}/like`,
        { method: 'POST' }
      );
      setPost((p) => (p ? { ...p, liked: r.liked, likeCount: r.likeCount } : p));
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const togglePostFavorite = async () => {
    try {
      const r = await request<{ favorited: boolean; favoriteCount: number }>(
        `/api/forum/posts/${id}/favorite`,
        { method: 'POST' }
      );
      setPost((p) =>
        p ? { ...p, favorited: r.favorited, favoriteCount: r.favoriteCount } : p
      );
      toast(r.favorited ? '已收藏' : '已取消收藏', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const toggleReplyLike = async (replyId: number) => {
    try {
      const r = await request<{ liked: boolean; likeCount: number }>(
        `/api/forum/replies/${replyId}/like`,
        { method: 'POST' }
      );
      setReplies((prev) =>
        prev.map((x) => (x.id === replyId ? { ...x, liked: r.liked, likeCount: r.likeCount } : x))
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const toggleAccept = async (replyId: number) => {
    try {
      const r = await request<{ accepted: boolean }>(`/api/forum/replies/${replyId}/accept`, {
        method: 'POST',
      });
      setReplies((prev) =>
        prev.map((x) =>
          x.id === replyId ? { ...x, accepted: r.accepted } : { ...x, accepted: false }
        )
      );
      toast(r.accepted ? '已采纳该回复(作者 +15 声望)' : '已取消采纳', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const toggleFollow = async () => {
    if (!post.author?.id) return;
    try {
      const now = await request<boolean>(`/api/forum/users/${post.author.id}/follow`, {
        method: 'POST',
      });
      setFollowing(now);
      toast(now ? `已关注 ${post.author.name}` : '已取消关注', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const applyTeam = async () => {
    if (!post.team) return;
    setApplying(true);
    try {
      await request(`/api/teams/${post.team.id}/apply`, {
        method: 'POST',
        body: { message: `看到论坛帖子「${post.title}」来申请加入` },
      });
      toast('申请已提交，等待队长审批', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '申请失败', 'error');
    } finally {
      setApplying(false);
    }
  };

  const submitReply = async () => {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      await request<ForumReply>(`/api/forum/posts/${id}/replies`, {
        method: 'POST',
        body: { content: replyContent },
      });
      setReplyContent('');
      toast('回复成功', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '回复失败', 'error');
    } finally {
      setSending(false);
    }
  };

  const deleteReply = async (replyId: number) => {
    if (!window.confirm('删除这条回复？')) return;
    try {
      await request(`/api/forum/replies/${replyId}`, { method: 'DELETE' });
      toast('回复已删除', 'success');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const deletePost = async () => {
    if (!window.confirm('删除这个帖子？所有回复也会被删除。')) return;
    try {
      await request(`/api/forum/posts/${id}`, { method: 'DELETE' });
      toast('帖子已删除', 'success');
      window.history.back();
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const teamProgress = post.team
    ? Math.min(100, Math.round(((post.team.memberCount ?? 0) / (post.team.sizeLimit || 1)) * 100))
    : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link to="/forum" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
        <ArrowLeft size={15} />
        返回论坛
      </Link>

      {/* 主帖 */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                {forumBoardName(post.board)}
              </span>
              {post.pinned && (
                <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-500 ring-1 ring-red-200">
                  <PushPin size={11} weight="fill" />
                  置顶
                </span>
              )}
              {post.essence && (
                <span className="flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                  <Star size={11} weight="fill" />
                  精华
                </span>
              )}
              {compName && (
                <Link
                  to={`/competitions/${post.competitionId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  <Trophy size={11} />
                  {compName}
                </Link>
              )}
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{post.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-400">
              <AuthorBadge
                author={post.author}
                identity={post.author?.id ? identities[post.author.id] : undefined}
              />
              <span>{post.createdAt?.replace('T', ' ').slice(0, 16)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye size={13} />
                {post.viewCount ?? 0} 浏览
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {canDelete(post.author?.id) && (
              <button
                onClick={deletePost}
                className="rounded-md p-2 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                title="删除帖子"
              >
                <TrashSimple size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 whitespace-pre-line border-t border-zinc-100 pt-5 text-[15px] leading-relaxed text-zinc-700">
          {post.content}
        </div>

        {/* 互动栏 */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={togglePostLike}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              post.liked
                ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            <Heart size={15} weight={post.liked ? 'fill' : 'regular'} />
            {post.likeCount ?? 0}
          </button>
          <button
            onClick={togglePostFavorite}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              post.favorited
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            <BookmarkSimple size={15} weight={post.favorited ? 'fill' : 'regular'} />
            收藏
          </button>
          {post.author?.id !== user?.id && post.author && (
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                following
                  ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              <UserPlus size={15} weight={following ? 'fill' : 'regular'} />
              {following ? '已关注' : '关注作者'}
            </button>
          )}
        </div>

        {/* 团队招募卡 */}
        {post.team && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-brand-200 bg-brand-50/60 px-4 py-3.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                <Users size={16} className="text-brand-600" />
                {post.team.name}
                {post.team.recruiting ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-200">
                    招募中
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">已满员</span>
                )}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                已招 {post.team.memberCount ?? 0}/{post.team.sizeLimit} 人
              </p>
              <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${teamProgress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/teams/${post.team.id}`}
                className="rounded-[10px] bg-white px-3.5 py-2 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                查看团队
              </Link>
              {post.team.recruiting && (
                <Button onClick={applyTeam} disabled={applying}>
                  {applying ? '提交中…' : '一键申请'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 回复区 */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-zinc-800">回复（{post.replyCount ?? 0}）</h2>

        <div className="mt-4 flex flex-col gap-4">
          {replies.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">还没有回复，来抢沙发</p>
          ) : (
            replies.map((r) => (
              <div
                key={r.id}
                className={`flex items-start gap-3 ${r.accepted ? 'rounded-[10px] ring-1 ring-emerald-200' : ''}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                  {r.author?.name?.charAt(0)}
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-[10px] px-4 py-3 ${
                    r.accepted ? 'bg-emerald-50/70' : 'bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <AuthorBadge
                      author={r.author}
                      identity={r.author?.id ? identities[r.author.id] : undefined}
                      small
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      {r.accepted && (
                        <span className="flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle size={12} weight="fill" />
                          已采纳
                        </span>
                      )}
                      {(user?.id === post.author?.id || user?.role === 'ADMIN') && (
                        <button
                          onClick={() => toggleAccept(r.id)}
                          title={r.accepted ? '取消采纳' : '采纳为最佳回复'}
                          className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                            r.accepted
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-white text-zinc-400 ring-1 ring-zinc-200 hover:text-emerald-600 hover:ring-emerald-300'
                          }`}
                        >
                          <CheckCircle size={12} weight={r.accepted ? 'fill' : 'regular'} />
                          {r.accepted ? '取消采纳' : '采纳'}
                        </button>
                      )}
                      {canDelete(r.author?.id) && (
                        <button
                          onClick={() => deleteReply(r.id)}
                          className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                          title="删除回复"
                        >
                          <TrashSimple size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {r.content}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      onClick={() => toggleReplyLike(r.id)}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        r.liked ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      <Heart size={13} weight={r.liked ? 'fill' : 'regular'} />
                      {r.likeCount ?? 0}
                    </button>
                    <span className="text-[11px] text-zinc-400">
                      {r.createdAt?.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 border-t border-zinc-100 pt-4">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={3}
            placeholder="写下你的回复…"
            className="w-full rounded-[10px] border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={submitReply} disabled={sending || !replyContent.trim()}>
              {sending ? '回复中…' : '回复'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** 作者徽章:姓名 + 等级 + 声望 + 学校认证 */
function AuthorBadge({
  author,
  identity,
  small,
}: {
  author?: { id?: number; name?: string; reputation?: number };
  identity?: UserIdentity;
  small?: boolean;
}) {
  const level = levelOf(author?.reputation);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`font-medium ${small ? 'text-xs text-zinc-600' : 'text-zinc-500'}`}>
        {author?.name}
      </span>
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${level.badge}`}>
        {level.name}
      </span>
      <span className="flex items-center gap-0.5 text-[10px] text-zinc-400" title="社区声望">
        <Medal size={11} />
        {author?.reputation ?? 0}
      </span>
      {identity?.verified && (
        <span
          className="flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200"
          title="管理员已认证身份"
        >
          <CheckCircle size={11} weight="fill" />
          已认证
        </span>
      )}
      {identity?.school && <span className="text-[10px] text-zinc-400">{identity.school}</span>}
    </span>
  );
}
