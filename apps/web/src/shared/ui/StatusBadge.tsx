import type { ItemStatus } from '../../legacy/database.types';

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string; dot: string; pulse: boolean }> = {
  in_stock: {
    label: '在库',
    className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    dot: 'bg-emerald-500',
    pulse: false,
  },
  borrowed: {
    label: '借出',
    className: 'bg-amber-50 text-amber-600 border border-amber-100',
    dot: 'bg-amber-500',
    pulse: true,
  },
  worn_out: {
    label: '损耗',
    className: 'bg-rose-50 text-rose-500 border border-rose-100',
    dot: 'bg-rose-400',
    pulse: false,
  },
};

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, className, dot, pulse } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap leading-none text-[10px] font-medium ${className}`}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dot}`} />
      </span>
      {label}
    </span>
  );
}
