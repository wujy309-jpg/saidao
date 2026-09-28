/** 与后端 API 对齐的类型定义 */

export type Category = 'ENGINEERING' | 'SCIENCE' | 'LIBERAL_ARTS' | 'COMPREHENSIVE';
export type Level = 'SCHOOL' | 'PROVINCIAL' | 'NATIONAL' | 'INTERNATIONAL';
export type Format = 'INDIVIDUAL' | 'TEAM';

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
  /** 竞赛目录:教育部目录/高教学会榜单/行业大赛/国际赛事 */
  catalogList?: string;
  /** 保研加分 */
  baoyanBonus?: boolean;
  /** 报名费 */
  entryFee?: string;
  /** 赛制规则与评审标准 */
  rules?: string;
  status: 'ACTIVE' | 'CLOSED';
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

export interface RecommendationItem {
  competitionId: number;
  name: string;
  category: Category;
  level: Level;
  format: Format;
  teamSizeMax?: number;
  organizer?: string;
  registrationEnd?: string;
  competitionDate?: string;
  difficulty: number;
  prestige: number;
  tags?: string[];
  description?: string;
  officialUrl?: string;
  catalogList?: string;
  baoyanBonus?: boolean;
  entryFee?: string;
  matchScore: number;
  reason: string;
  favorited: boolean;
  /** 五维匹配度（0-100） */
  disciplineScore?: number;
  gradeScore?: number;
  difficultyScore?: number;
  timeScore?: number;
  goalScore?: number;
}

export type JourneyStatus = 'WATCHING' | 'REGISTERED' | 'PREPARING' | 'COMPLETED' | 'AWARDED';

export interface MyCompetitionItem {
  competition: Competition;
  status: JourneyStatus;
  updatedAt?: string;
}

export type FeedbackAction = 'LIKE' | 'DISLIKE';

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

// ============ 历年优秀作品 ============

export type WorkType = 'PAPER' | 'PROJECT' | 'VIDEO' | 'ARTWORK';

export interface ExcellentWork {
  id: number;
  competitionId: number;
  competitionName: string;
  title: string;
  description?: string;
  year?: number;
  award?: string;
  team?: string;
  type: WorkType;
  link?: string;
}

export interface RecommendationResponse {
  items: RecommendationItem[];
  generatedAt: string;
  profileSummary: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: number;
}

export interface LoginData {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface Repo {
  id: number;
  name: string;
  description?: string;
  projectId?: number;
  owner?: User | number;
  defaultBranch?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  language?: string;
  starCount?: number;
  createdAt?: string;
}

export interface RepoBranch {
  id: number;
  name: string;
  latestCommitId?: string;
  isProtected?: boolean;
}

export interface RepoFile {
  id: number;
  branchName?: string;
  filePath?: string;
  fileName?: string;
  content?: string;
  /** 磁盘存储路径（二进制文件），非空时通过 download 接口获取 */
  storagePath?: string;
  fileType: 'FILE' | 'DIRECTORY';
  fileSize?: number;
  lastCommitHash?: string;
  lastModifiedBy?: User;
  lastModifiedAt?: string;
}

export interface RepoCommit {
  id: number;
  commitHash?: string;
  message: string;
  description?: string;
  author?: User;
  parentHash?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  committedAt?: string;
}

export interface RepoMember {
  id: number;
  user: User;
  role: 'OWNER' | 'MAINTAINER' | 'DEVELOPER' | 'REPORTER' | 'GUEST';
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

// ============ 团队 ============

export interface Team {
  id: number;
  name: string;
  slogan?: string;
  description?: string;
  leader?: User;
  recruiting: boolean;
  sizeLimit: number;
  memberCount: number;
  targetCompetition?: string;
  createdAt?: string;
}

export interface TeamMemberInfo {
  id: number;
  user: User;
  role: 'LEADER' | 'MEMBER';
  joinedAt?: string;
}

export interface TeamApplication {
  id: number;
  team?: Team;
  user: User;
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

// ============ 论坛 ============

export type ForumBoard = 'TEAM_FIND' | 'Q_AND_A' | 'EXPERIENCE' | 'GENERAL';

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
  /** 当前用户是否点赞/收藏 */
  liked?: boolean;
  favorited?: boolean;
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

export type NotificationType = 'REPLY' | 'LIKE_POST' | 'LIKE_REPLY' | 'FOLLOW' | 'ESSENCE' | 'ACCEPTED';

export interface NotificationItem {
  id: number;
  userId: number;
  type: NotificationType;
  actorId?: number | null;
  postId?: number | null;
  replyId?: number | null;
  summary?: string | null;
  read: boolean;
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

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

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
  paymentNote: string;
  wechatQrUrl: string;
  alipayQrUrl: string;
}
