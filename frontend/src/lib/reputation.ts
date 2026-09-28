/** 社区声望与等级 */

export interface LevelMeta {
  name: string;
  badge: string;
  min: number;
}

export const LEVELS: LevelMeta[] = [
  { name: '新手', min: 0, badge: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200' },
  { name: '活跃', min: 10, badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' },
  { name: '达人', min: 50, badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  { name: '竞赛之星', min: 150, badge: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' },
];

export function levelOf(reputation?: number): LevelMeta {
  const rep = reputation ?? 0;
  let cur = LEVELS[0];
  for (const l of LEVELS) {
    if (rep >= l.min) cur = l;
  }
  return cur;
}

export function nextLevel(reputation?: number): LevelMeta | null {
  const rep = reputation ?? 0;
  for (const l of LEVELS) {
    if (rep < l.min) return l;
  }
  return null;
}
