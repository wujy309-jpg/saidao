import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { Competition } from '../lib/types';
import { CategoryBadge, LevelBadge } from './ui';

/** 竞赛搜索选择器:输入关键词过滤,替代全量下拉 */
export default function CompetitionSearch({
  competitions,
  value,
  onChange,
}: {
  competitions: Competition[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = competitions.find((c) => c.id === value);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 打开时聚焦并重置关键词
  useEffect(() => {
    if (open) {
      setKw('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = kw.trim().toLowerCase();
    if (!q) return competitions.slice(0, 8);
    const starts = competitions.filter((c) => c.name.toLowerCase().startsWith(q));
    const contains = competitions.filter(
      (c) =>
        !c.name.toLowerCase().startsWith(q) &&
        (c.name.toLowerCase().includes(q) || (c.tags ?? []).some((t) => t.toLowerCase().includes(q)))
    );
    return [...starts, ...contains].slice(0, 10);
  }, [kw, competitions]);

  return (
    <div className="relative" ref={ref}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-10 items-center gap-2 rounded-[12px] border px-3.5 text-sm shadow-[var(--shadow-card)] transition-colors ${
          open ? 'border-brand-400 bg-white' : 'border-emerald-900/10 bg-white hover:border-brand-300'
        }`}
      >
        {selected ? (
          <span className="max-w-[180px] truncate font-semibold text-zinc-800 md:max-w-[220px]">
            {selected.name}
          </span>
        ) : (
          <span className="text-zinc-400">搜索并选择比赛…</span>
        )}
        {selected && (
          <span
            role="button"
            title="清除选择"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={13} />
          </span>
        )}
        <CaretDown
          size={13}
          className={`shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[82vw] overflow-hidden rounded-[14px] border border-emerald-900/10 bg-white shadow-[var(--shadow-lift)]">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3.5 py-2.5">
            <MagnifyingGlass size={15} className="shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && results.length > 0) {
                  onChange(results[0].id);
                  setOpen(false);
                }
              }}
              placeholder="输入竞赛名称或标签,如:数模 / 算法"
              className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-zinc-400">
                没有找到「{kw.trim()}」,换个关键词试试
              </p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-brand-50 ${
                    c.id === value ? 'bg-brand-50' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-800">
                      {c.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <CategoryBadge category={c.category} />
                      <LevelBadge level={c.level} />
                      {c.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </span>
                  </span>
                  {c.id === value && (
                    <span className="shrink-0 text-sm font-bold text-brand-600">✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          <p className="border-t border-zinc-100 px-3.5 py-2 text-[10.5px] text-zinc-400">
            共 {competitions.length} 个竞赛 · 输入关键词快速定位
          </p>
        </div>
      )}
    </div>
  );
}
