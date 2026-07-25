import { Box, MapPin, Package, Shapes, type LucideIcon } from 'lucide-react';
import type { CategoryScope } from '../../../legacy/database.types';

export type InventoryEntityKind = CategoryScope | 'category';

const ENTITY_PRESENTATION: Record<InventoryEntityKind, {
  label: string;
  icon: LucideIcon;
  className: string;
}> = {
  location: {
    label: '位置',
    icon: MapPin,
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  container: {
    label: '收纳',
    icon: Box,
    className: 'border-teal-200 bg-teal-50 text-teal-700',
  },
  item: {
    label: '物品',
    icon: Package,
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  category: {
    label: '类别',
    icon: Shapes,
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
};

export default function EntityBadge({
  kind,
  compact = false,
  className = '',
}: {
  kind: InventoryEntityKind;
  compact?: boolean;
  className?: string;
}) {
  const presentation = ENTITY_PRESENTATION[kind];
  const Icon = presentation.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-semibold ${presentation.className} ${
        compact ? 'h-5 gap-1 px-1.5 text-[10px]' : 'h-6 gap-1.5 px-2 text-xs'
      } ${className}`}
    >
      <Icon size={compact ? 11 : 13} aria-hidden="true" />
      {presentation.label}
    </span>
  );
}
