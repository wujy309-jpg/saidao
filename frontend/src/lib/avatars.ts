import type { Icon } from '@phosphor-icons/react';
import {
  BookOpen,
  Code,
  Compass,
  Flask,
  Leaf,
  Lightbulb,
  Palette,
  Rocket,
  Star,
  Trophy,
} from '@phosphor-icons/react';

/**
 * 系统预设头像目录。
 *
 * <p>ID 必须与后端 {@code AvatarPresets.IDS} 保持一致（后端只做白名单校验并落库为
 * {@code preset:<id>}，视觉全部在前端渲染）。遇到不认识的 ID 会退化成昵称首字色块，
 * 所以万一两端不同步，页面也不会坏。
 *
 * <p>为什么要有预设：大部分同学不会为了一个课程项目去挑图片上传，
 * 一键就能换上一个「像样」的头像，社区真实感的提升最直接。
 */
export interface AvatarPreset {
  id: string;
  /** 选项里展示的名字 */
  label: string;
  /** 圆形底色渐变（Tailwind 类） */
  gradient: string;
  icon: Icon;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'rocket', label: '探索', gradient: 'from-emerald-500 to-teal-700', icon: Rocket },
  { id: 'book', label: '学术', gradient: 'from-sky-500 to-indigo-700', icon: BookOpen },
  { id: 'bulb', label: '灵感', gradient: 'from-amber-400 to-orange-600', icon: Lightbulb },
  { id: 'trophy', label: '荣誉', gradient: 'from-violet-500 to-purple-800', icon: Trophy },
  { id: 'code', label: '工程', gradient: 'from-slate-600 to-zinc-900', icon: Code },
  { id: 'palette', label: '设计', gradient: 'from-rose-400 to-pink-700', icon: Palette },
  { id: 'flask', label: '科研', gradient: 'from-cyan-500 to-blue-700', icon: Flask },
  { id: 'compass', label: '规划', gradient: 'from-blue-500 to-indigo-800', icon: Compass },
  { id: 'leaf', label: '成长', gradient: 'from-lime-500 to-green-700', icon: Leaf },
  { id: 'star', label: '目标', gradient: 'from-yellow-400 to-amber-600', icon: Star },
];

const PRESET_BY_ID = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

/** 预设头像的落库前缀（与后端 AvatarPresets.PREFIX 一致） */
export const PRESET_PREFIX = 'preset:';

/** 预设头像引用 → 预设定义；不是预设或 ID 不认识时返回 null */
export function presetOf(avatarUrl?: string | null): AvatarPreset | null {
  if (!avatarUrl || !avatarUrl.startsWith(PRESET_PREFIX)) return null;
  return PRESET_BY_ID.get(avatarUrl.slice(PRESET_PREFIX.length)) ?? null;
}

export function isPresetRef(avatarUrl?: string | null): boolean {
  return Boolean(avatarUrl && avatarUrl.startsWith(PRESET_PREFIX));
}

/**
 * 默认头像的确定性配色：同一个人无论在哪台设备、哪个页面都拿到同一个颜色。
 * 用昵称做哈希而不是随机数，否则每次渲染都会换色，看起来像图片加载失败。
 */
const FALLBACK_GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-700',
  'from-rose-500 to-pink-700',
  'from-cyan-500 to-blue-700',
  'from-lime-500 to-green-700',
  'from-fuchsia-500 to-purple-700',
];

export function fallbackGradient(seed?: string | number | null): string {
  const key = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

/**
 * 头像文字回退：取昵称首字。
 * 用 Array.from 而不是 charAt，避免把 emoji / 生僻字的代理对切一半变成乱码。
 */
export function initialOf(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const [first] = Array.from(trimmed);
  return /[a-z]/.test(first) ? first.toUpperCase() : first;
}
