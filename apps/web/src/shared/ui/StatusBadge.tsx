import { ITEM_STATUS_PRESENTATION } from '@inplace/app-core';
import type { ItemStatus } from '../../legacy/database.types';

const STATUS_TONE_CONFIG: Record<ItemStatus, { className: string; dot: string }> = {
  in_stock: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
  },
  borrowed: {
    className: 'bg-amber-50 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
  },
  worn_out: {
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    dot: 'bg-rose-400',
  },
};

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label } = ITEM_STATUS_PRESENTATION[status];
  const { className, dot } = STATUS_TONE_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap leading-none text-[10px] font-medium ${className}`}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dot}`} />
      </span>
      {label}
    </span>
  );
}
