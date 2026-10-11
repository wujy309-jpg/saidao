/** 与后端计费 API 对齐的类型定义 */

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface UserBalanceView {
  userId: number;
  username: string;
  name: string;
  role: string;
  email?: string;
  department?: string;
  balance: number;
  totalRecharged: number;
  totalConsumed: number;
  totalGranted: number;
}

export type TxType = 'RECHARGE' | 'CARD' | 'CONSUME' | 'REFUND' | 'ORDER_REFUND' | 'GRANT' | 'ADJUST';

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
export type PayChannel = 'WECHAT' | 'ALIPAY' | 'BANK_TRANSFER' | 'OTHER';

export interface RechargeOrder {
  id: number;
  orderNo: string;
  userId: number;
  packageId?: number;
  packageName?: string;
  priceYuan: number;
  tokens: number;
  channel: PayChannel;
  status: OrderStatus;
  remark?: string;
  createdAt: string;
  paidAt?: string;
  paidBy?: string;
  refundedAt?: string;
  refundedBy?: string;
  refundReason?: string;
}

export interface CardKey {
  id: number;
  code: string;
  batchNo: string;
  packageId?: number;
  packageName?: string;
  tokens: number;
  status: 'UNUSED' | 'USED';
  usedByUserId?: number;
  usedAt?: string;
  remark?: string;
  createdAt: string;
}

export interface TokenSceneConfig {
  id?: number;
  scene: string;
  label: string;
  price: number;
  enabled: boolean;
  sortOrder?: number;
}

export interface BillingSetting {
  id: number;
  dailyFreeTokens: number;
  registerBonusTokens: number;
  freeQuotaEnabled: boolean;
  /** 用户充值开关：关闭期间不接受任何付费（非经营性备案期间的合规要求），下单接口直接拒绝 */
  rechargeEnabled?: boolean;
  paymentNote?: string;
  wechatQrUrl?: string;
  alipayQrUrl?: string;
  /** 上游 LLM 单价（元 / 百万 token），用于成本核算 */
  llmInputPricePerMTok: number;
  llmOutputPricePerMTok: number;
  /** 待确认订单超时提醒阈值（小时） */
  pendingOrderAlertHours: number;
}

export interface SceneStat {
  scene: string;
  count: number;
  settledCount: number;
  releasedCount: number;
}

/** 待确认订单超时提醒 */
export interface PendingAlert {
  thresholdHours: number;
  overdueCount: number;
  orders: {
    id: number;
    orderNo: string;
    userId: number;
    packageName?: string;
    priceYuan: number;
    createdAt: string;
    ageMinutes: number;
  }[];
}

/* ============ AI 成本与可观测 ============ */

export type AiCallStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED';

export interface AiCallLog {
  id: number;
  refId: string;
  userId: number;
  scene: string;
  status: AiCallStatus;
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostYuan: number | string;
  chargedTokens: number;
  model?: string;
  errorType?: string;
  createdAt: string;
}

export interface AiSceneStat {
  scene: string;
  label: string;
  calls: number;
  llmCalls: number;
  success: number;
  degraded: number;
  failed: number;
  successRate: number;
  degradedRate: number;
  failureRate: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgTokensPerCall: number;
  estimatedCostYuan: number;
  chargedTokens: number;
  revenueYuan: number;
  grossProfitYuan: number;
  grossMargin: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface AiStats {
  start: string;
  end: string;
  summary: {
    calls: number;
    llmCalls: number;
    success: number;
    degraded: number;
    failed: number;
    successRate: number;
    degradedRate: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostYuan: number;
    chargedTokens: number;
    revenueYuan: number;
    grossProfitYuan: number;
    grossMargin: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    inputPricePerMTok: number;
    outputPricePerMTok: number;
  };
  scenes: AiSceneStat[];
  trend: {
    date: string;
    calls: number;
    totalTokens: number;
    estimatedCostYuan: number;
    chargedTokens: number;
  }[];
}

/* ============ 审计日志 ============ */

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  details?: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface OverviewData {
  today: {
    rechargeAmount: number;
    rechargeCount: number;
    rechargedTokens: number;
    consumedTokens: number;
    refundedTokens: number;
    activeUsers: number;
    /** 今天登录过的去重人数（真实活跃口径） */
    loginUsers: number;
    pendingOrders: number;
    aiCalls: number;
    aiCostYuan: number | string;
  };
  total: {
    rechargeAmount: number;
    rechargedTokens: number;
    consumedTokens: number;
    grantedTokens: number;
    refundedAmount: number;
    refundedTokens: number;
    paidUsers: number;
    registeredUsers: number;
    /** 近 7 天登录过的去重人数 */
    loginUsers7d: number;
  };
  sceneStatsToday: SceneStat[];
  sceneStatsTotal: SceneStat[];
  recentOrders: RechargeOrder[];
  aiStatsToday: AiStats['summary'];
  pendingAlert: PendingAlert;
}

/* ============ 竞赛管理（从主站后台迁入） ============ */

export type Category = 'ENGINEERING' | 'SCIENCE' | 'LIBERAL_ARTS' | 'COMPREHENSIVE';
export type Level = 'SCHOOL' | 'PROVINCIAL' | 'NATIONAL' | 'INTERNATIONAL';
export type Format = 'INDIVIDUAL' | 'TEAM';

export interface Competition {
  id: number;
  name: string;
  category: Category;
  disciplines?: string[];
  level: Level;
  organizer?: string;
  registrationStart?: string;
  registrationEnd?: string;
  competitionDate?: string;
  format: Format;
  teamSizeMax?: number;
  difficulty: number;
  prestige: number;
  suitableGrades?: number[];
  tags?: string[];
  description?: string;
  officialUrl?: string;
  catalogList?: string;
  baoyanBonus?: boolean;
  entryFee?: string;
  rules?: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface LegacyUser {
  id: number;
  username: string;
  name: string;
  role: 'ADMIN' | 'STUDENT';
  email?: string;
  department?: string;
}
