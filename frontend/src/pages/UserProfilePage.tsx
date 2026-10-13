import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Medal,
  Trophy,
  ChatCircleText,
  Heart,
  Users,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import { useAuth } from '../lib/auth';
import { levelOf } from '../lib/reputation';
import type { UserProfileDTO, ForumPostDTO } from '../types';
import { Avatar } from '../components/Avatar';
import { Button, Card, Skeleton } from '../components/ui';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [posts, setPosts] = useState<ForumPostDTO[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      request<UserProfileDTO>(`/api/users/${userId}/profile`).catch(() => null),
      request<ForumPostDTO[]>(`/api/forum/posts?authorId=${userId}&size=50`).then(
        (d) => {
          if (Array.isArray(d)) return d;
          // listPosts 返回 Page，取 content
          const page = d as unknown as { content?: ForumPostDTO[] };
          return page?.content ?? [];
        }
      ).catch(() => []),
    ])
      .then(([p, ps]) => {
        setProfile(p);
        setPosts(ps);
        // 检查当前用户是否已关注
        if (currentUser && currentUser.id !== Number(userId)) {
          request<boolean>(`/api/forum/users/${userId}/follow`, { method: 'POST' })
            .then((now) => setFollowing(now))
            .catch(() => undefined);
        }
      })
      .finally(() => setLoading(false));
  }, [userId, currentUser]);

  const toggleFollow = async () => {
    if (!profile) return;
    try {
      const now = await request<boolean>(`/api/forum/users/${profile.id}/follow`, {
        method: 'POST',
      });
      setFollowing(now);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: prev.followerCount + (now ? 1 : -1),
            }
          : prev,
      );
      toast(now ? `已关注 ${profile.name}` : '已取消关注', 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!profile) return <p className="py-16 text-center text-sm text-zinc-500">用户不存在</p>;

  const level = levelOf(profile.reputation ?? 0);
  const isSelf = currentUser?.id === profile.id;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-700"
      >
        <ArrowLeft size={16} /> 返回
      </Link>

      {/* 用户信息卡片 */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size={64} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-900">{profile.name}</h1>
                {profile.verified && (
                  <span className="flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200">
                    <CheckCircle size={11} weight="fill" />
                    已认证
                  </span>
                )}
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${level.badge}`}>
                  {level.name}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                {profile.school && <span>{profile.school}</span>}
                <span className="flex items-center gap-0.5" title="社区声望">
                  <Medal size={12} />
                  {profile.reputation ?? 0}
                </span>
              </p>
            </div>
          </div>
          {!isSelf && (
            <Button
              variant={following ? 'outline' : 'primary'}
              onClick={toggleFollow}
            >
              <Users size={15} weight={following ? 'fill' : 'regular'} />
              {following ? '已关注' : '关注'}
            </Button>
          )}
        </div>

        {/* 统计数据 */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <Stat icon={<ChatCircleText size={18} />} label="发帖" value={profile.postCount} />
          <Stat icon={<Heart size={18} />} label="回复" value={profile.replyCount} />
          <Stat icon={<Trophy size={18} />} label="采纳" value={profile.acceptedCount} />
          <div className="flex items-center justify-around rounded-xl bg-zinc-50 px-3 py-3">
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900">{profile.followingCount}</p>
              <p className="text-[10px] text-zinc-400">关注</p>
            </div>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900">{profile.followerCount}</p>
              <p className="text-[10px] text-zinc-400">粉丝</p>
            </div>
          </div>
        </div>

        {/* 参赛历史 */}
        {profile.competitionHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-700">参赛历史</h3>
            <div className="flex flex-wrap gap-2">
              {profile.competitionHistory.map((name, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 发帖列表 */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-zinc-900">TA 的帖子</h2>
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">暂无帖子</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <Link key={p.id} to={`/forum/posts/${p.id}`}>
                <Card className="cursor-pointer p-4 transition hover:ring-2 hover:ring-indigo-200">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate text-sm font-medium text-zinc-900">{p.title}</h3>
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {p.createdAt?.replace('T', ' ').slice(0, 10)}
                    </span>
                  </div>
                  {p.content && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{p.content}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-0.5">
                      <Heart size={11} /> {p.likeCount ?? 0}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <ChatCircleText size={11} /> {p.replyCount ?? 0}
                    </span>
                    {p.essence && (
                      <span className="text-amber-600">精华</span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-zinc-50 px-3 py-3">
      <div className="text-zinc-400">{icon}</div>
      <p className="mt-1 text-lg font-bold text-zinc-900">{value}</p>
      <p className="text-[10px] text-zinc-400">{label}</p>
    </div>
  );
}
