/** 用户相关类型 */

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'STUDENT';
  email?: string;
  phone?: string;
  department?: string;
  studentId?: string;
  /** 社区声望 */
  reputation?: number;
}

export interface UserBrief {
  id: number;
  name: string;
  reputation?: number;
  role?: string;
}

/** 用户主页 DTO（后端 UserProfileDTO 对应） */
export interface UserProfileDTO {
  id: number;
  name: string;
  school?: string | null;
  reputation?: number | null;
  verified?: boolean | null;
  role?: string | null;
  postCount: number;
  replyCount: number;
  acceptedCount: number;
  competitionHistory: string[];
  followingCount: number;
  followerCount: number;
}

export interface UserProfile {
  id?: number;
  userId?: number;
  discipline?: string;
  major?: string;
  grade?: number;
  interests?: string[];
  skills?: string[];
  goals?: string[];
  weeklyHours?: number;
  hasExperience?: boolean;
  preferredLevel?: string;
  description?: string;
  /** 学校 */
  school?: string;
  /** 获奖履历 */
  achievements?: string;
  /** 管理员认证 */
  verified?: boolean;
  updatedAt?: string;
}

/** 用户身份信息(社区作者卡片) */
export interface UserIdentity {
  school?: string;
  achievements?: string;
  verified?: boolean;
}
