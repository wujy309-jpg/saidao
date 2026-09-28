import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Medal } from '@phosphor-icons/react';
import { request } from '../lib/api';
import { CATALOG_META, CATALOG_OPTIONS, CATEGORY_META, FORMAT_META, LEVEL_META } from '../lib/labels';
import { REG_PHASE_META, deadlineText, isDeadlineSoon, regPhase } from '../lib/dates';
import type { Category, Competition, Format, Level } from '../lib/types';
import { Card, CategoryBadge, LevelBadge, Pill, Skeleton, Stars } from '../components/ui';

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '全部类别' },
  { value: 'ENGINEERING', label: '工科' },
  { value: 'SCIENCE', label: '理科' },
  { value: 'LIBERAL_ARTS', label: '文科' },
  { value: 'COMPREHENSIVE', label: '综合' },
];

export default function CompetitionsPage() {
  const [params] = useSearchParams();
  const [list, setList] = useState<Competition[] | null>(null);
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [format, setFormat] = useState('');
  const [catalog, setCatalog] = useState('');
  const [baoyanOnly, setBaoyanOnly] = useState(false);
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');

  // 顶部导航搜索进入时同步关键词
  useEffect(() => {
    setKeyword(params.get('keyword') ?? '');
  }, [params]);

  useEffect(() => {
    request<Competition[]>('/api/competitions', {
      params: {
        category,
        level,
        format,
        catalogList: catalog,
        baoyanBonus: baoyanOnly ? 'true' : '',
        keyword,
      },
    })
      .then((d) => setList(d ?? []))
      .catch(() => setList([]));
  }, [category, level, format, catalog, baoyanOnly, keyword]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    list?.forEach((c) => {
      m[c.category] = (m[c.category] ?? 0) + 1;
    });
    return m;
  }, [list]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-zinc-900">竞赛库</h1>
        <p className="text-sm text-zinc-400">
          收录 {list?.length ?? '…'} 个竞赛，覆盖工科、理科、文科与综合方向
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-64">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索竞赛名称或标签"
            className="w-full rounded-[10px] border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategory(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                category === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:ring-zinc-300'
              }`}
            >
              {f.label}
              {f.value && counts[f.value] ? ` ${counts[f.value]}` : ''}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 md:ml-auto">
          <select
            value={catalog}
            onChange={(e) => setCatalog(e.target.value)}
            className="rounded-[10px] border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-600"
          >
            <option value="">全部目录</option>
            {CATALOG_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATALOG_META[c].label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setBaoyanOnly(!baoyanOnly)}
            title="只看保研加分的竞赛"
            className={`flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition-colors ${
              baoyanOnly
                ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                : 'border border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <Medal size={14} weight={baoyanOnly ? 'fill' : 'regular'} />
            保研加分
          </button>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-[10px] border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-600"
          >
            <option value="">全部级别</option>
            {(Object.keys(LEVEL_META) as Level[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_META[l].label}
              </option>
            ))}
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-[10px] border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-600"
          >
            <option value="">全部形式</option>
            {(Object.keys(FORMAT_META) as Format[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_META[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 列表 */}
      {list === null ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const phase = regPhase(c.registrationStart, c.registrationEnd);
            const soon = isDeadlineSoon(c.registrationEnd);
            return (
              <Link key={c.id} to={`/competitions/${c.id}`}>
                <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={c.category} />
                    <LevelBadge level={c.level} />
                    {c.baoyanBonus && (
                      <Pill tone="red">
                        <Medal size={11} weight="fill" />
                        保研加分
                      </Pill>
                    )}
                    {c.catalogList && CATALOG_META[c.catalogList] && (
                      <Pill tone="neutral">{CATALOG_META[c.catalogList].label}</Pill>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-1 text-[15px] font-bold text-zinc-900">
                    {c.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {c.description}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-zinc-400">
                    <Stars value={c.difficulty} label="难度" />
                    <span>{FORMAT_META[c.format]}</span>
                    {c.registrationEnd && phase && (
                      <span className={`ml-auto font-semibold ${soon ? 'text-red-500' : REG_PHASE_META[phase].text}`}>
                        {soon ? `⏰ ${deadlineText(c.registrationEnd)}` : REG_PHASE_META[phase].label}
                      </span>
                    )}
                  </div>
                  {c.tags && c.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {list && list.length === 0 && (
        <p className="py-16 text-center text-sm text-zinc-400">
          没有找到匹配的竞赛，换个筛选条件试试
        </p>
      )}
    </div>
  );
}
