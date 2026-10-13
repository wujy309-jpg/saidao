/** 论坛与通知相关类型 */

import type { User } from './user';
import type { Team, TeamBrief } from './team';

export type ForumBoard = 'TEAM_FIND' | 'Q_AND_A' | 'EXPERIENCE' | 'GENERAL';

/** 论坛帖子列表 DTO（后端 ForumPostDTO 对应） */
export interface ForumPostDTO {
  id: number;
  title: string;
  content?: string;
  board: string;
  competitionId?: number | null;
  competitionName?: string | null;
  authorId?: number | null;
  authorName?: string | null;
  authorReputation?: number | null;
  authorVerified?: boolean | null;
  authorAvatar?: string | null;
  teamBrief?: TeamBrief | null;
  likeCount?: number;
  replyCount?: number;
  viewCount?: number;
  favoriteCount?: number;
  essence?: boolean;
  pinned?: boolean;
  liked?: boolean;
  favorited?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumPost {
  id: number;
  board: ForumBoard;
  title: string;
  content?: string;
  author?: User;
  team?: Team;
  competitionId?: number | null;
  viewCount: number;
  replyCount: number;
  likeCount?: number;
  favoriteCount?: number;
  essence?: boolean;
  pinned?: boolean;
  /** 当前用户是否点赞/收藏/关注作者 */
  liked?: boolean;
  favorited?: boolean;
  following?: boolean;
  createdAt?: string;
}

export interface ForumReply {
  id: number;
  content: string;
  author?: User;
  likeCount?: number;
  /** 楼主采纳 */
  accepted?: boolean;
  /** 当前用户是否点赞 */
  liked?: boolean;
  createdAt?: string;
}

export type NotificationType =
  | 'REPLY' | 'LIKE_POST' | 'LIKE_REPLY' | 'FOLLOW' | 'ESSENCE' | 'ACCEPTED'
  | 'MENTION' | 'REPORT_RESULT'
  | 'TEAM_APPLY' | 'TEAM_APPROVED' | 'TEAM_REJECTED'
  | 'TEAM_REMOVED' | 'TEAM_DISBANDED' | 'TEAM_TRANSFER'
  | 'TOKEN_LOW' | 'RECHARGE_PAID' | 'SYSTEM';

export interface NotificationItem {
  id: number;
  userId: number;
  type: NotificationType;
  actorId?: number | null;
  actorName?: string | null;
  /** 触发者头像（历史通知可能为空，组件会回退到首字色块） */
  actorAvatar?: string | null;
  postId?: number | null;
  replyId?: number | null;
  teamId?: number | null;
  summary?: string | null;
  read: boolean;
  createdAt?: string;
}
