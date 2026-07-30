import {
  CircleDollarSign,
  LocateFixed,
  MapPinned,
  MapPinOff,
  type LucideIcon,
} from 'lucide-react';
import type { GeoAssetMapTotals } from '../lib/geoAssetMap';
import {
  formatAssetMapCurrency,
  formatAssetMapNumber,
} from '../lib/assetMapPresentation';

interface AssetMapSummaryProps {
  totals: GeoAssetMapTotals;
  visibleAssetCount: number;
}

interface MapMetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

export default function AssetMapSummary({
  totals,
  visibleAssetCount,
}: AssetMapSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="家庭资产统计">
      <MapMetricCard
        label="已标注位置"
        value={formatAssetMapNumber(totals.mappedLocationCount)}
        icon={MapPinned}
        tone="bg-sky-50 text-sky-700"
      />
      <MapMetricCard
        label="地图内资产"
        value={formatAssetMapNumber(visibleAssetCount)}
        icon={LocateFixed}
        tone="bg-teal-50 text-teal-700"
      />
      <MapMetricCard
        label="未定位资产"
        value={formatAssetMapNumber(totals.unlocatedAssetCount)}
        icon={MapPinOff}
        tone="bg-amber-50 text-amber-800"
      />
      <MapMetricCard
        label="已定位总值"
        value={formatAssetMapCurrency(totals.estimatedValue)}
        icon={CircleDollarSign}
        tone="bg-violet-50 text-violet-700"
      />
    </section>
  );
}

function MapMetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: MapMetricCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-3 truncate text-xl font-bold text-slate-950 md:text-2xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}
