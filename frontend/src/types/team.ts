/** 团队相关类型 */

import type { UserBrief } from './user';
import type { Repo } from './repo';

/** 团队简要信息（列表/嵌入场景使用） */
export interface TeamBrief {
  id: number;
  name: string;
  slogan?: string;
}

export interface Team {
  id: number;
  name: string;
  slogan?: string;
  description?: string;
  leader?: UserBrief;
  recruiting: boolean;
  sizeLimit: number;
  memberCount: number;
  targetCompetition?: string;
  createdAt?: string;
}

export interface TeamMemberInfo {
  id: number;
  user: UserBrief;
  role: 'LEADER' | 'MEMBER';
  joinedAt?: string;
}

export interface TeamApplication {
  id: number;
  team?: Team;
  user: UserBrief;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
}

export interface TeamDetail {
  team: Team;
  members: TeamMemberInfo[];
  repos: Repo[];
  isMember: boolean;
  isLeader: boolean;
  hasPendingApplication: boolean;
}
