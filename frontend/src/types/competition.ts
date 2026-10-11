/** 竞赛相关类型 */

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

export type FeedbackAction = 'LIKE' | 'DISLIKE';

export type JourneyStatus = 'WATCHING' | 'REGISTERED' | 'PREPARING' | 'COMPLETED' | 'AWARDED';

export interface MyCompetitionItem {
  competition: Competition;
  status: JourneyStatus;
  updatedAt?: string;
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

export interface RecommendationResponse {
  items: RecommendationItem[];
  generatedAt: string;
  profileSummary: string;
}
