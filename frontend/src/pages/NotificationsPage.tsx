import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BookmarkSimple,
  ChatCircleDots,
  CheckCircle,
  Heart,
  Star,
  TrashSimple,
  UserPlus,
} from '@phosphor-icons/react';
import { request, toast } from '../lib/api';
import type { NotificationItem, NotificationType } from '../lib/types';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';

const NOTIFICATION_META: Record<
  NotificationType,
  { label: string; icon: typeof Bell; color: string }
> = {
  REPLY: { label: '回复了你的帖子', icon: ChatCircleDots, color: 'bg-sky-50 text-sky-600' },
  LIKE_POST: { label: '赞了你的帖子', icon: Heart, color: 'bg-rose-50 text-rose-500' },
  LIKE_REPLY: { label: '赞了你的回复', icon: Heart, color: 'bg-rose-50 text-rose-500' },
  FOLLOW: { label: '关注了你', icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
  ESSENCE: { label: '你的帖子被设为精华', icon: Star, color: 'bg-amber-50 text-amber-600' },
  ACCEPTED: {
    label: '采纳了你的回复(+15声望)',
    icon: CheckCircle,
    color: 'bg-emerald-50 text-emerald-600',
  },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = useCallback(() => {
    request<NotificationItem[]>('/api/forum/notifications')
      .then((d) => setItems(d ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(load, [load]);

  const markAll = async () => {
    try {
      await request('/api/forum/notifications/read-all', { method: 'POST' });
      toast('已全部标记为已读', 'success');
      load();
      window.dispatchEvent(new Event('notifications-changed'));
    } catch (err) {
      toast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const remove = async (id: number) => {
    try {
      await request(`/api/forum/notifications/${id}`, { method: 'DELETE' });
      load();
      window.dispatchEvent(new Event('notifications-changed'));
    } catch (err) {
      toast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const open = async (n: NotificationItem) => {
    if (!n.read) {
      request(`/api/forum/notifications/${n.id}/read`, { method: 'POST' })
        .then(() => window.dispatchEvent(new Event('notifications-changed')))
        .catch(() => undefined);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">通知</h1>
          <p className="mt-1 text-sm text-zinc-400">回复、点赞、关注与精华提醒</p>
        </div>
        {items && items.length > 0 && (
          <Button variant="ghost" onClick={markAll}>
            全部已读
          </Button>
        )}
      </div>

      {items === null ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="还没有通知"
          description="去论坛发帖、回复,或给别人点赞,互动起来就会收到通知。"
        />
      ) : (
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {items.map((n) => {
            const meta = NOTIFICATION_META[n.type];
            const Icon = meta.icon;
            const target = n.postId ? `/forum/posts/${n.postId}` : null;
            const inner = (
              <div className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-700">
                    <span className="font-medium">{meta.label}</span>
                    {n.summary && (
                      <span className="text-zinc-500">:「{n.summary}」</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {n.createdAt?.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </div>
            );
            return (
              <div key={n.id} className="group relative flex items-center">
                {target ? (
                  <Link to={target} onClick={() => open(n)} className="flex-1">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex-1">{inner}</div>
                )}
                <button
                  onClick={() => remove(n.id)}
                  title="删除通知"
                  className="mr-3 hidden shrink-0 rounded-md p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                >
                  <TrashSimple size={14} />
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
