import { Box, Clock3, Package, ShieldCheck } from 'lucide-react';
import { INVENTORY_NODE_LABELS } from '@inplace/app-core';

interface InventoryStatsLike {
  total: number;
  containers: number;
  items: number;
  borrowed: number;
}

interface InventoryStatsGridProps {
  stats: InventoryStatsLike | null;
  loading?: boolean;
  onNavigate?: (filter?: { type?: string; status?: string }) => void;
  className?: string;
  cardClassName?: string;
  showCaptions?: boolean;
}

const STAT_CARDS = [
  { label: '总物品', caption: '查看物品清单', statKey: 'items', icon: Package, color: 'bg-brandTint text-brandStrong', filter: { type: 'item' } },
  { label: INVENTORY_NODE_LABELS.mixedContainer, caption: '位置与收纳记录', statKey: 'containers', icon: Box, color: 'bg-emerald-50 text-emerald-600', filter: { type: 'container' } },
  { label: '借出中', caption: '及时查看归还情况', statKey: 'borrowed', icon: Clock3, color: 'bg-amber-50 text-amber-500', filter: { status: 'borrowed' } },
  { label: '总计', caption: '全部库存对象', statKey: 'total', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-500', filter: {} },
] as const;

export default function InventoryStatsGrid({
  stats,
  loading = false,
  onNavigate,
  className = 'grid grid-cols-2 gap-3',
  cardClassName = '',
  showCaptions = false,
}: InventoryStatsGridProps) {
  return (
    <div className={className}>
      {STAT_CARDS.map(({ label, caption, statKey, icon: Icon, color, filter }) => {
        const value = loading ? '-' : stats?.[statKey] ?? 0;
        const clickable = Boolean(onNavigate);

        return (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate?.(filter)}
            disabled={!clickable}
            className={`min-w-0 rounded-xl text-left transition-colors ${
              clickable ? 'cursor-pointer hover:bg-brandTint' : 'cursor-default'
            } ${cardClassName || 'bg-white p-4'}`}
          >
            <div className={`stat-icon mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="stat-value text-2xl font-semibold tabular-nums text-ink">{value}</p>
            <p className="stat-label mt-1 text-xs text-muted">{label}</p>
            {showCaptions ? <p className="stat-caption mt-2 hidden text-xs text-muted md:block">{caption}</p> : null}
          </button>
        );
      })}
    </div>
  );
}
