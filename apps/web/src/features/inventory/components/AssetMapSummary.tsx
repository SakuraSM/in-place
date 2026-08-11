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
  visibleEstimatedValue: number;
}

interface MapMetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
  href?: string;
}

export default function AssetMapSummary({
  totals,
  visibleAssetCount,
  visibleEstimatedValue,
}: AssetMapSummaryProps) {
  return (
    <section className="grid grid-cols-4 gap-2 lg:gap-3" aria-label="家庭资产统计">
      <MapMetricCard
        label="已标注位置"
        value={formatAssetMapNumber(totals.mappedLocationCount)}
        icon={MapPinned}
        tone="bg-sky-50 text-sky-700"
      />
      <MapMetricCard
        label="匹配资产"
        value={formatAssetMapNumber(visibleAssetCount)}
        icon={LocateFixed}
        tone="bg-teal-50 text-teal-700"
      />
      <MapMetricCard
        label="未定位资产"
        value={formatAssetMapNumber(totals.unlocatedAssetCount)}
        icon={MapPinOff}
        tone="bg-amber-50 text-amber-800"
        href={totals.unlocatedAssetCount > 0 ? '#map-unlocated-locations' : undefined}
      />
      <MapMetricCard
        label="匹配估值"
        value={formatAssetMapCurrency(visibleEstimatedValue)}
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
  href,
}: MapMetricCardProps) {
  const content = (
    <>
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl md:h-10 md:w-10 md:rounded-2xl ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="mt-2 truncate text-sm font-bold tabular-nums text-slate-950 sm:text-base md:mt-3 md:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] font-medium leading-4 text-slate-600 md:text-xs">{label}</p>
    </>
  );

  const className = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm md:rounded-3xl md:p-4';
  if (href) {
    return (
      <a href={href} className={`${className} transition hover:border-brand/30 hover:bg-brandTint focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong`}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
