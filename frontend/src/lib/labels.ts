import type { Category, Level, Format, ForumBoard, JourneyStatus, WorkType } from './types';

export const CATEGORY_META: Record<Category, { label: string; badge: string; dot: string }> = {
  ENGINEERING: {
    label: '工科',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
  },
  SCIENCE: {
    label: '理科',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    dot: 'bg-violet-500',
  },
  LIBERAL_ARTS: {
    label: '文科',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
  },
  COMPREHENSIVE: {
    label: '综合',
    badge: 'bg-brand-100 text-brand-700 ring-brand-200',
    dot: 'bg-brand-500',
  },
};

export const LEVEL_META: Record<Level, { label: string; order: number }> = {
  SCHOOL: { label: '校级', order: 1 },
  PROVINCIAL: { label: '省级', order: 2 },
  NATIONAL: { label: '国家级', order: 3 },
  INTERNATIONAL: { label: '国际级', order: 4 },
};

export const FORMAT_META: Record<Format, string> = {
  INDIVIDUAL: '个人赛',
  TEAM: '团队赛',
};

export const GRADE_LABELS: Record<number, string> = {
  1: '大一',
  2: '大二',
  3: '大三',
  4: '大四',
  5: '研究生',
};

export const DISCIPLINE_OPTIONS = ['工科', '理科', '文科', '经管', '医学', '农学', '艺术', '其他'];

export const INTEREST_OPTIONS = [
  '编程',
  '算法',
  '人工智能',
  '硬件',
  '嵌入式',
  '机器人',
  '数学',
  '数学建模',
  '物理',
  '化学',
  '生物',
  '英语',
  '写作',
  '演讲',
  '辩论',
  '设计',
  '摄影',
  '视频创作',
  '商业分析',
  '市场营销',
  '创新创业',
  '法律',
  '新闻传播',
  '数据分析',
];

export const SKILL_OPTIONS = [
  'Python',
  'Java',
  'C/C++',
  'JavaScript',
  'MATLAB',
  'SQL',
  'PPT',
  'Excel',
  '数据分析',
  '平面设计',
  '视频剪辑',
  '写作',
  '英语口语',
  '英语写作',
  '单片机',
  '电路设计',
  '机械制图',
  '3D建模',
];

export const GOAL_OPTIONS = ['保研加分', '求职简历', '出国申请', '能力锻炼', '兴趣探索', '竞赛获奖'];

export const WEEKLY_HOURS_OPTIONS = [
  { value: 3, label: '3小时以内' },
  { value: 5, label: '3-7小时' },
  { value: 8, label: '7-10小时' },
  { value: 12, label: '10小时以上' },
];

export const LEVEL_OPTIONS: Level[] = ['SCHOOL', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL'];

/** 竞赛目录标签 */
export const CATALOG_META: Record<string, { label: string; badge: string }> = {
  教育部目录: { label: '教育部目录', badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
  高教学会榜单: { label: '高教学会榜单', badge: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' },
  行业大赛: { label: '行业大赛', badge: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' },
  国际赛事: { label: '国际赛事', badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
};

export const CATALOG_OPTIONS = ['教育部目录', '高教学会榜单', '行业大赛', '国际赛事'];

export const JOURNEY_STATUS_META: Record<JourneyStatus, { label: string; badge: string }> = {
  WATCHING: { label: '关注', badge: 'bg-zinc-100 text-zinc-500' },
  REGISTERED: { label: '已报名', badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  PREPARING: { label: '备赛中', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  COMPLETED: { label: '已完赛', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  AWARDED: { label: '获奖', badge: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
};

export const JOURNEY_STATUS_OPTIONS: JourneyStatus[] = [
  'WATCHING',
  'REGISTERED',
  'PREPARING',
  'COMPLETED',
  'AWARDED',
];

export const MATCH_DIMENSIONS: {
  key: 'disciplineScore' | 'gradeScore' | 'difficultyScore' | 'timeScore' | 'goalScore';
  label: string;
}[] = [
  { key: 'disciplineScore', label: '学科匹配' },
  { key: 'gradeScore', label: '年级匹配' },
  { key: 'difficultyScore', label: '难度匹配' },
  { key: 'timeScore', label: '时间投入' },
  { key: 'goalScore', label: '目标契合' },
];

export const WORK_TYPE_META: Record<WorkType, { label: string; badge: string }> = {
  PAPER: { label: '论文', badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  PROJECT: { label: '项目', badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  VIDEO: { label: '视频', badge: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
  ARTWORK: { label: '作品', badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
};

export const FORUM_BOARDS: { code: ForumBoard; name: string; desc: string }[] = [
  { code: 'TEAM_FIND', name: '找队友', desc: '招募队员、毛遂自荐' },
  { code: 'Q_AND_A', name: '竞赛问答', desc: '赛制备赛问题互助' },
  { code: 'EXPERIENCE', name: '经验分享', desc: '获奖复盘与干货' },
  { code: 'GENERAL', name: '综合交流', desc: '聊竞赛、聊学习' },
];

export function forumBoardName(board: ForumBoard): string {
  return FORUM_BOARDS.find((b) => b.code === board)?.name ?? board;
}

export function matchScoreTone(score: number): string {
  if (score >= 85) return 'text-brand-600';
  if (score >= 70) return 'text-zinc-700';
  return 'text-zinc-500';
}
