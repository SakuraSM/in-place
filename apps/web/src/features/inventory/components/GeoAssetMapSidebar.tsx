import { ExternalLink, LocateFixed, MapPinOff, X } from 'lucide-react';
import type { AssetMapNode } from '../lib/assetMap';
import type { GeoAssetMapPoint } from '../lib/geoAssetMap';
import {
  formatAssetMapCurrency,
  formatAssetMapNumber,
} from '../lib/assetMapPresentation';

interface GeoAssetMapSidebarProps {
  selectedPoint: GeoAssetMapPoint | null;
  unmappedLocations: AssetMapNode[];
  assignmentTarget: AssetMapNode | null;
  canEdit: boolean;
  onAssignLocation: (location: AssetMapNode) => void;
  onCancelAssignment: () => void;
  onViewDetails: (node: AssetMapNode) => void;
}

const UNMAPPED_PREVIEW_LIMIT = 8;

export default function GeoAssetMapSidebar({
  selectedPoint,
  unmappedLocations,
  assignmentTarget,
  canEdit,
  onAssignLocation,
  onCancelAssignment,
  onViewDetails,
}: GeoAssetMapSidebarProps) {
  if (assignmentTarget) {
    return (
      <aside className="rounded-3xl border border-brand/30 bg-brandTint p-5 shadow-sm" aria-label="地图标注">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brandStrong">正在标注</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{assignmentTarget.item.name}</h2>
          </div>
          <button
            type="button"
            onClick={onCancelAssignment}
            aria-label="取消地图标注"
            className="cursor-pointer rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          在左侧真实地图上点击该位置。系统会记录坐标并自动识别附近地址，其下所有资产将聚合到此标记。
        </p>
        <button
          type="button"
          onClick={onCancelAssignment}
          className="mt-4 w-full cursor-pointer rounded-2xl border border-brand/30 bg-white px-4 py-2.5 text-sm font-bold text-brandStrong transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
        >
          取消标注
        </button>
      </aside>
    );
  }

  if (selectedPoint) {
    return (
      <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label={`${selectedPoint.sourceNode.item.name}地图详情`}>
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-brandStrong">地图位置</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">{selectedPoint.sourceNode.item.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {selectedPoint.coordinate.address || '暂未识别详细地址'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="资产种类" value={formatAssetMapNumber(selectedPoint.metrics.assetCount)} />
            <Metric label="估算价值" value={formatAssetMapCurrency(selectedPoint.metrics.estimatedValue)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={() => onAssignLocation(selectedPoint.sourceNode)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
              >
                <LocateFixed size={15} aria-hidden="true" />
                重新标注
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={() => onViewDetails(selectedPoint.sourceNode)}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-brandStrong px-3 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
            >
              <ExternalLink size={15} aria-hidden="true" />
              查看位置
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-3">
          <p className="px-2 pb-2 text-xs font-bold text-slate-500">此处资产</p>
          {selectedPoint.assets.length > 0 ? selectedPoint.assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onViewDetails(asset)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">{asset.item.name}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {asset.item.category || '未分类'} · 数量 {asset.item.quantity}
                </span>
              </span>
              <ExternalLink size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          )) : (
            <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">此位置暂时没有资产</p>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="待标注位置">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <MapPinOff size={21} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-950">选择地图标记查看资产</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {canEdit
          ? '还可以先为家庭位置标注真实坐标，位置下的物品会自动显示在地图中。'
          : '当前为只读权限，可查看已经标注的资产位置。'}
      </p>

      {unmappedLocations.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-bold text-slate-500">待标注位置（{unmappedLocations.length}）</p>
          <div className="space-y-1">
            {unmappedLocations.slice(0, UNMAPPED_PREVIEW_LIMIT).map((location) => (
              <div key={location.id} className="flex items-center justify-between gap-2 rounded-2xl px-2 py-2">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{location.item.name}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onAssignLocation(location)}
                    className="shrink-0 cursor-pointer rounded-xl bg-brandTint px-3 py-1.5 text-xs font-bold text-brandStrong transition hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong"
                  >
                    地图标注
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="truncate text-base font-bold text-slate-950">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}
