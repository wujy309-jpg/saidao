import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

/* ============ 按钮 ============ */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-[var(--radius-control)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    ghost: 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50',
    danger: 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100',
    subtle: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
  } as const;
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
  } as const;
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />
  );
}

/* ============ 卡片 ============ */

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}

/* ============ 表单 ============ */

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`rounded-[var(--radius-control)] border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...rest}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      className={`rounded-[var(--radius-control)] border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...rest}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      className={`rounded-[var(--radius-control)] border border-zinc-200 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-brand-600' : 'bg-zinc-200'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5.5' : 'translate-x-1'
        }`}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

/* ============ 徽章 ============ */

export function Badge({ cls = 'bg-zinc-100 text-zinc-600 ring-zinc-200', children }: { cls?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {children}
    </span>
  );
}

/* ============ 弹窗 ============ */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={onClose} />
      <div
        className={`relative flex max-h-[88vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} flex-col rounded-[var(--radius-card)] bg-white p-6 shadow-xl animate-rise`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            ✕
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ============ 统计卡 ============ */

export function StatCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'brand' | 'amber' | 'red' | 'zinc';
  onClick?: () => void;
}) {
  const accents = {
    brand: 'text-brand-700',
    amber: 'text-amber-600',
    red: 'text-red-600',
    zinc: 'text-zinc-800',
  } as const;
  return (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer transition-shadow hover:shadow-[var(--shadow-lift)]' : ''}`}
    >
      <button type="button" onClick={onClick} className="block w-full text-left" disabled={!onClick}>
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className={`num mt-1.5 text-2xl font-semibold ${accents[accent ?? 'zinc']}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
      </button>
    </Card>
  );
}

/* ============ 分页 ============ */

export function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1 && totalElements === 0) {
    return <p className="py-8 text-center text-sm text-zinc-400">暂无数据</p>;
  }
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-zinc-400">共 {totalElements.toLocaleString()} 条</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 0} onClick={() => onChange(page - 1)}>
          上一页
        </Button>
        <span className="num px-2 text-xs text-zinc-500">
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
          下一页
        </Button>
      </div>
    </div>
  );
}

/* ============ 空态 ============ */

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return <p className="py-10 text-center text-sm text-zinc-400">{text}</p>;
}

/* ============ 表格 ============ */

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs text-zinc-400">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">{children}</tbody>
      </table>
    </div>
  );
}
