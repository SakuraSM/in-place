import { ITEM_STATUS_PRESENTATION } from '@inplace/app-core';
import type { ItemStatus } from '../../legacy/database.types';

const STATUS_TONE_CONFIG: Record<ItemStatus, { className: string; dot: string }> = {
  in_stock: {
    className: 'bg-successTint text-success',
    dot: 'bg-success',
  },
  borrowed: {
    className: 'bg-warningTint text-warning',
    dot: 'bg-warning',
  },
  worn_out: {
    className: 'bg-dangerTint text-danger',
    dot: 'bg-danger',
  },
};

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const { label } = ITEM_STATUS_PRESENTATION[status];
  const { className, dot } = STATUS_TONE_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap leading-none text-[11px] font-medium ${className}`}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dot}`} />
      </span>
      {label}
    </span>
  );
}
