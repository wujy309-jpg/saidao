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

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';
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
  paymentNote?: string;
  wechatQrUrl?: string;
  alipayQrUrl?: string;
}

export interface SceneStat {
  scene: string;
  count: number;
  tokens: number;
}

export interface OverviewData {
  today: {
    rechargeAmount: number;
    rechargeCount: number;
    rechargedTokens: number;
    consumedTokens: number;
    activeUsers: number;
    pendingOrders: number;
  };
  total: {
    rechargeAmount: number;
    rechargedTokens: number;
    consumedTokens: number;
    grantedTokens: number;
    paidUsers: number;
    registeredUsers: number;
  };
  sceneStatsToday: SceneStat[];
  sceneStatsTotal: SceneStat[];
  recentOrders: RechargeOrder[];
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
