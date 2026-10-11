/** 通用类型：API 响应、备赛计划、AI 助手、文档、Token 计费 */

import type { User, UserProfile } from './user';
import type { Competition, ExcellentWork, JourneyStatus } from './competition';

// ============ API 通用 ============

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: number;
}

/** Spring Data Page 分页响应 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface LoginData {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// ============ 备赛计划 ============

export interface PreparationPlan {
  id: number;
  competitionId: number;
  competitionName: string;
  title: string;
  overview?: string;
  /** 参赛目标:冲奖/稳完赛/体验 */
  goal?: string;
  /** 每周可投入小时 */
  weeklyHours?: number;
  /** 生成时的现状盘点 */
  baseline?: string;
  startDate?: string;
  endDate?: string;
  /** 比赛/截止时间原文 */
  targetDate?: string;
  taskCount: number;
  doneCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PreparationTask {
  id: number;
  phaseTitle: string;
  title: string;
  description?: string;
  /** 建议完成日期(倒排) */
  dueDate?: string;
  /** 预估耗时(小时) */
  estimatedHours?: number;
  sortOrder: number;
  done: boolean;
  doneAt?: string;
}

export interface PlanPhase {
  title: string;
  tasks: PreparationTask[];
  doneCount: number;
  totalCount: number;
  /** 为什么这么安排 */
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export interface PlanDetail {
  plan: PreparationPlan;
  phases: PlanPhase[];
  progress: number;
}

// ============ AI 竞赛助手 ============

export interface AssistantSession {
  id: number;
  userId: number;
  competitionId: number;
  competitionName?: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssistantMessage {
  id: number;
  sessionId: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string;
}

export interface AssistantContextData {
  competition: Competition;
  works: ExcellentWork[];
  profile: UserProfile | null;
  journeyStatus: JourneyStatus | null;
  teams: {
    id: number;
    name: string;
    slogan?: string;
    targetCompetition?: string;
    role: string;
    memberCount: number;
    members: string[];
  }[];
  repos: { name: string; description?: string; language?: string; files: string[] }[];
  plan: {
    title: string;
    overview?: string;
    doneCount: number;
    taskCount: number;
    tasks: { phase: string; title: string; done: boolean }[];
  } | null;
}

/** 用户上传的竞赛资料 */
export interface UserDocument {
  id: number;
  userId: number;
  competitionId: number;
  fileName: string;
  fileExt?: string;
  fileSize?: number;
  /** 是否已成功解析文本(AI 可读取) */
  hasText?: boolean;
  createdAt?: string;
}

// ============ Token 计费 ============

export interface TokenAccount {
  id: number;
  userId: number;
  balance: number;
  totalRecharged: number;
  totalConsumed: number;
  totalGranted: number;
  lastFreeGrantDate?: string;
}

export type TxType = 'RECHARGE' | 'CARD' | 'CONSUME' | 'REFUND' | 'GRANT' | 'ADJUST';

export interface TokenTransaction {
  id: number;
  userId: number;
  type: TxType;
  scene?: string;
  amount: number;
  balanceAfter: number;
  refId?: string;
  remark?: string;
  createdAt: string;
}

export interface TokenPackage {
  id: number;
  name: string;
  description?: string;
  priceYuan: number;
  tokens: number;
  bonusTokens: number;
  enabled: boolean;
  sortOrder: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface RechargeOrder {
  id: number;
  orderNo: string;
  userId: number;
  packageId?: number;
  packageName?: string;
  priceYuan: number;
  tokens: number;
  channel: string;
  status: OrderStatus;
  remark?: string;
  createdAt: string;
  paidAt?: string;
}

export interface TokenSceneConfig {
  id?: number;
  scene: string;
  label: string;
  price: number;
  enabled: boolean;
}

export interface BillingPaymentInfo {
  /** 充值是否开放；关闭时后端不下发收款码与转账说明 */
  rechargeEnabled?: boolean;
  paymentNote: string;
  wechatQrUrl: string;
  alipayQrUrl: string;
}
