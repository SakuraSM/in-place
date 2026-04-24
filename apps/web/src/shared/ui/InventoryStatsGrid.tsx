import { Box, Clock3, Package, ShieldCheck } from 'lucide-react';

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
}

const STAT_CARDS = [
  { label: '总物品', statKey: 'items', icon: Package, color: 'bg-sky-50 text-sky-500', filter: { type: 'item' } },
  { label: '收纳数', statKey: 'containers', icon: Box, color: 'bg-teal-50 text-teal-500', filter: { type: 'container' } },
  { label: '借出中', statKey: 'borrowed', icon: Clock3, color: 'bg-amber-50 text-amber-500', filter: { status: 'borrowed' } },
  { label: '总计', statKey: 'total', icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-500', filter: {} },
] as const;

export default function InventoryStatsGrid({
  stats,
  loading = false,
  onNavigate,
  className = 'grid grid-cols-2 gap-3',
  cardClassName = '',
}: InventoryStatsGridProps) {
  return (
    <div className={className}>
      {STAT_CARDS.map(({ label, statKey, icon: Icon, color, filter }) => {
        const value = loading ? '-' : stats?.[statKey] ?? 0;
        const clickable = Boolean(onNavigate);

        return (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate?.(filter)}
            disabled={!clickable}
            className={`rounded-2xl border border-slate-100 text-left shadow-sm transition-all ${
              clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'
            } ${cardClassName || 'bg-white p-4'}`}
          >
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{label}</p>
          </button>
        );
      })}
    </div>
  );
}
