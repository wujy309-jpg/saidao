import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { CATEGORY_META, LEVEL_META } from '../lib/labels';
import type { Category, Level } from '../lib/types';

/** 主按钮(全站唯一实心强调色,控件圆角 12px) */
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition-all active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_2px_8px_rgba(5,150,105,.3)]',
    ghost: 'text-zinc-600 hover:bg-brand-50 hover:text-brand-800',
    outline: 'border border-zinc-300 bg-white text-zinc-700 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50/40',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  } as const;
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** 类别徽章(语义色胶囊) */
export function CategoryBadge({ category }: { category: Category }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const order = LEVEL_META[level].order;
  const tone =
    order === 4
      ? 'bg-zinc-900 text-white'
      : order === 3
        ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
        : 'bg-zinc-100 text-zinc-600';
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${tone}`}>
      {LEVEL_META[level].label}
    </span>
  );
}

/** 状态胶囊(截止红/报名中绿/精华琥珀/认证天蓝等,详见各页使用) */
export function Pill({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'red' | 'amber' | 'sky' | 'violet';
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
    brand: 'bg-brand-100 text-brand-700 ring-1 ring-brand-200',
    red: 'bg-red-50 text-red-500 ring-1 ring-red-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    sky: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** 卡片(暖白画布上的白卡 + 翠绿调柔和阴影,替代灰边框堆砌) */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-emerald-900/8 bg-white shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  );
}

/** 表单字段:label 在上,错误在下 */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-[var(--radius-control)] border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 hover:border-zinc-400 ${className}`}
      {...rest}
    />
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600 ${className}`}
    />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-zinc-300 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** 难度星级(5 档) */
export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i <= value ? 'bg-zinc-700' : 'bg-zinc-200'}`}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

/** 选项标签(可多选 + 支持自定义输入) */
export function ChipGroupCustom({
  options,
  values,
  onChange,
  placeholder = '输入自定义选项，回车添加',
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [custom, setCustom] = useState('');
  const [adding, setAdding] = useState(false);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  const commit = () => {
    const v = custom.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setCustom('');
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`rounded-full px-3.5 py-1.5 text-sm transition-all active:translate-y-[1px] ${
            values.includes(o)
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-brand-300 hover:text-brand-700'
          }`}
        >
          {o}
        </button>
      ))}
      {/* 用户自定义的已选标签 */}
      {values
        .filter((v) => !options.includes(v))
        .map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            title="点击移除"
            className="rounded-full bg-brand-50 px-3.5 py-1.5 text-sm text-brand-700 ring-1 ring-brand-200 transition-all active:translate-y-[1px]"
          >
            {v} ×
          </button>
        ))}
      {adding ? (
        <input
          autoFocus
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') setAdding(false);
          }}
          onBlur={commit}
          placeholder={placeholder}
          className="w-48 rounded-full border border-brand-400 bg-white px-3.5 py-1.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full border border-dashed border-brand-400 bg-brand-50 px-3.5 py-1.5 text-sm text-brand-600 transition-colors hover:bg-brand-100"
        >
          + 自定义
        </button>
      )}
    </div>
  );
}
