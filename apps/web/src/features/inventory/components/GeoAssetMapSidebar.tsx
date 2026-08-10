import { useMemo, useState } from 'react';
import { ExternalLink, Layers3, LocateFixed, MapPinOff, Save, X } from 'lucide-react';
import type { AssetMapNode } from '../lib/assetMap';
import type { AssetGeoLocation, GeoAssetMapPoint } from '../lib/geoAssetMap';
import {
  formatAssetMapCurrency,
  formatAssetMapNumber,
} from '../lib/assetMapPresentation';

interface GeoAssetMapSidebarProps {
  selectedPoints: GeoAssetMapPoint[];
  unmappedLocations: AssetMapNode[];
  assignmentTarget: AssetMapNode | null;
  canEdit: boolean;
  onAssignLocation: (location: AssetMapNode) => void;
  onCancelAssignment: () => void;
  onSaveCoordinate: (coordinate: AssetGeoLocation) => Promise<void>;
  onViewDetails: (node: AssetMapNode) => void;
}

const UNMAPPED_PREVIEW_LIMIT = 8;

export default function GeoAssetMapSidebar({
  selectedPoints,
  unmappedLocations,
  assignmentTarget,
  canEdit,
  onAssignLocation,
  onCancelAssignment,
  onSaveCoordinate,
  onViewDetails,
}: GeoAssetMapSidebarProps) {
  if (assignmentTarget) {
    return <CoordinateAssignmentCard target={assignmentTarget} onCancel={onCancelAssignment} onSave={onSaveCoordinate} />;
  }

  if (selectedPoints.length > 1) {
    return <SelectedMapPointGroup points={selectedPoints} onViewDetails={onViewDetails} />;
  }

  const selectedPoint = selectedPoints[0];
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

function CoordinateAssignmentCard({
  target,
  onCancel,
  onSave,
}: {
  target: AssetMapNode;
  onCancel: () => void;
  onSave: (coordinate: AssetGeoLocation) => Promise<void>;
}) {
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const parsedLongitude = Number(longitude);
  const parsedLatitude = Number(latitude);
  const isCoordinateValid = longitude.trim() !== ''
    && latitude.trim() !== ''
    && Number.isFinite(parsedLongitude)
    && Number.isFinite(parsedLatitude)
    && parsedLongitude >= -180
    && parsedLongitude <= 180
    && parsedLatitude >= -90
    && parsedLatitude <= 90;

  const handleSave = async (): Promise<void> => {
    if (!isCoordinateValid || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        longitude: parsedLongitude,
        latitude: parsedLatitude,
        address: address.trim() || `${parsedLongitude.toFixed(6)}, ${parsedLatitude.toFixed(6)}`,
      });
    } catch {
      // The parent renders the actionable save error above the map.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className="rounded-3xl border border-brand/30 bg-brandTint p-5 shadow-sm" aria-label="地图标注">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brandStrong">正在标注</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{target.item.name}</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="取消地图标注" className="cursor-pointer rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        可直接点击左侧地图自动识别地址，也可以输入经纬度精确标注。其下资产会聚合到该位置。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <CoordinateField label="经度" value={longitude} min={-180} max={180} onChange={setLongitude} />
        <CoordinateField label="纬度" value={latitude} min={-90} max={90} onChange={setLatitude} />
      </div>
      <label className="mt-2 block">
        <span className="mb-1 block text-xs font-bold text-slate-600">地址备注（可选）</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="例如：杭州仓库" className="h-10 w-full rounded-xl border border-brand/30 bg-white px-3 text-sm outline-none focus:border-brandStrong focus:ring-2 focus:ring-brand/20" />
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-2xl border border-brand/30 bg-white px-4 py-2.5 text-sm font-bold text-brandStrong transition hover:bg-white/70">取消</button>
        <button type="button" disabled={!isCoordinateValid || isSaving} onClick={() => void handleSave()} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brandStrong px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Save size={15} aria-hidden="true" />
          {isSaving ? '保存中...' : '保存坐标'}
        </button>
      </div>
    </aside>
  );
}

function CoordinateField({ label, value, min, max, onChange }: { label: string; value: string; min: number; max: number; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <input type="number" step="any" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-brand/30 bg-white px-3 text-sm outline-none focus:border-brandStrong focus:ring-2 focus:ring-brand/20" />
    </label>
  );
}

function SelectedMapPointGroup({ points, onViewDetails }: { points: GeoAssetMapPoint[]; onViewDetails: (node: AssetMapNode) => void }) {
  const assets = useMemo(() => points.flatMap((point) => point.assets), [points]);
  const totalValue = useMemo(() => points.reduce((total, point) => total + point.metrics.estimatedValue, 0), [points]);

  return (
    <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label={`${points.length}个地图位置详情`}>
      <div className="border-b border-slate-200 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Layers3 size={21} aria-hidden="true" /></span>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-brandStrong">聚合区域</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">{points.length} 个地图位置</h2>
        <p className="mt-2 text-sm text-slate-600">{points.map((point) => point.sourceNode.item.name).join('、')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="资产种类" value={formatAssetMapNumber(assets.length)} />
          <Metric label="估算价值" value={formatAssetMapCurrency(totalValue)} />
        </div>
      </div>
      <div className="max-h-[390px] overflow-y-auto p-3">
        {points.map((point) => (
          <div key={point.id} className="mb-2 rounded-2xl bg-slate-50 p-2 last:mb-0">
            <button type="button" onClick={() => onViewDetails(point.sourceNode)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-2 text-left hover:bg-white">
              <span className="font-bold text-slate-900">{point.sourceNode.item.name}</span>
              <span className="text-xs text-slate-500">{point.metrics.assetCount} 项</span>
            </button>
            {point.assets.slice(0, 4).map((asset) => (
              <button key={asset.id} type="button" onClick={() => onViewDetails(asset)} className="flex w-full cursor-pointer items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-white">
                <span className="truncate">{asset.item.name}</span><ExternalLink size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}
      </div>
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
