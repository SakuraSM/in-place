import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, KeyRound, MapPinned, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Item } from '@inplace/domain';
import { useAuth } from '../../../app/providers/auth-context';
import { updateItem } from '../../../legacy/items';
import { fetchMapRuntimeConfig } from '../api/mapApi';
import {
  buildGeoAssetMapProjection,
  updateAssetGeoLocationMetadata,
  type AssetGeoLocation,
} from '../lib/geoAssetMap';
import {
  filterGeoAssetMapPoints,
  GEO_ASSET_ALL_FILTER,
  type GeoAssetMapFilters,
} from '../lib/geoAssetMapFilters';
import { resolveItemDetailPath } from '../lib/detailPath';
import AmapAssetCanvas from './AmapAssetCanvas';
import AssetMapSummary from './AssetMapSummary';
import GeoAssetMapSidebar from './GeoAssetMapSidebar';
import GeoAssetMapToolbar from './GeoAssetMapToolbar';

interface AssetMapViewProps {
  householdId: string | null;
  canEdit: boolean;
  items: Item[];
  onRequestCreateLocation: () => void;
}

const DEFAULT_FILTERS: GeoAssetMapFilters = {
  query: '',
  status: GEO_ASSET_ALL_FILTER,
  category: GEO_ASSET_ALL_FILTER,
  createdAfter: '',
  createdBefore: '',
};

const MAP_CONFIG_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export default function AssetMapView({
  householdId,
  canEdit,
  items,
  onRequestCreateLocation,
}: AssetMapViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const projection = useMemo(() => buildGeoAssetMapProjection(items), [items]);
  const [filters, setFilters] = useState<GeoAssetMapFilters>(DEFAULT_FILTERS);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [assignmentTargetId, setAssignmentTargetId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const mapConfigQuery = useQuery({
    queryKey: ['maps', 'amap-config'],
    queryFn: fetchMapRuntimeConfig,
    staleTime: MAP_CONFIG_STALE_TIME_MS,
    retry: false,
  });
  const filteredPoints = useMemo(
    () => filterGeoAssetMapPoints(projection, filters),
    [filters, projection],
  );
  const filteredPointsById = useMemo(
    () => new Map(filteredPoints.map((point) => [point.id, point])),
    [filteredPoints],
  );
  const selectedPoints = selectedPointIds.flatMap((pointId) => {
    const point = filteredPointsById.get(pointId);
    return point ? [point] : [];
  });
  const assignmentTarget = assignmentTargetId
    ? projection.unmappedLocations.find((location) => location.id === assignmentTargetId)
      ?? projection.pointsById.get(assignmentTargetId)?.sourceNode
      ?? null
    : null;
  const visibleAssetCount = useMemo(
    () => filteredPoints.reduce((count, point) => count + point.metrics.assetCount, 0),
    [filteredPoints],
  );
  const visibleEstimatedValue = useMemo(
    () => filteredPoints.reduce((total, point) => total + point.metrics.estimatedValue, 0),
    [filteredPoints],
  );

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    setSelectedPointIds([]);
    setAssignmentTargetId(null);
    setSaveError(null);
  }, [householdId]);

  useEffect(() => {
    if (selectedPointIds.some((pointId) => !projection.pointsById.has(pointId))) {
      setSelectedPointIds((current) => current.filter((pointId) => projection.pointsById.has(pointId)));
    }
    if (assignmentTargetId && !assignmentTarget) {
      setAssignmentTargetId(null);
    }
  }, [assignmentTarget, assignmentTargetId, projection.pointsById, selectedPointIds]);

  useEffect(() => {
    if (selectedPointIds.some((pointId) => !filteredPointsById.has(pointId))) {
      setSelectedPointIds((current) => current.filter((pointId) => filteredPointsById.has(pointId)));
    }
  }, [filteredPointsById, selectedPointIds]);

  const handleAssignLocation = useCallback((locationId: string): void => {
    if (!canEdit) {
      return;
    }
    setSaveError(null);
    setAssignmentTargetId(locationId);
    setSelectedPointIds([]);
  }, [canEdit]);

  const handleCoordinateChosen = useCallback(async (
    coordinate: AssetGeoLocation,
  ): Promise<void> => {
    if (!assignmentTarget || !canEdit) {
      return;
    }

    try {
      setSaveError(null);
      await updateItem(assignmentTarget.id, {
        metadata: updateAssetGeoLocationMetadata(
          assignmentTarget.item.metadata,
          coordinate,
        ),
      });
      await queryClient.invalidateQueries({
        queryKey: ['inventory', 'all-items', user?.id, householdId],
      });
      setSelectedPointIds([assignmentTarget.id]);
      setAssignmentTargetId(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '位置保存失败，请稍后重试');
      throw error;
    }
  }, [assignmentTarget, canEdit, householdId, queryClient, user?.id]);

  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <MapPinned size={34} className="mx-auto text-slate-400" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-slate-950">地图上还没有资产</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          先创建一个家庭位置，再标注它在真实地图上的坐标，位置下的物品就会显示在地图中。
        </p>
        <button
          type="button"
          onClick={onRequestCreateLocation}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brandStrong px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandStrong"
        >
          <Plus size={16} aria-hidden="true" />
          新增位置
        </button>
      </section>
    );
  }

  if (mapConfigQuery.isLoading) {
    return <MapConfigurationLoading />;
  }

  if (mapConfigQuery.isError) {
    return (
      <MapConfigurationMessage
        icon={AlertTriangle}
        title="地图配置读取失败"
        description="服务端暂时无法返回地图配置，请检查服务状态后刷新页面。"
      />
    );
  }

  if (!mapConfigQuery.data?.enabled) {
    return (
      <MapConfigurationMessage
        icon={KeyRound}
        title="尚未启用真实地图"
        description="请在服务端同时配置 AMAP_JS_API_KEY 和 AMAP_JS_SECURITY_CODE，然后重启服务。安全密钥不会下发到浏览器。"
      />
    );
  }

  return (
    <div className="space-y-4">
      <AssetMapSummary
        totals={projection.totals}
        visibleAssetCount={visibleAssetCount}
        visibleEstimatedValue={visibleEstimatedValue}
      />

      <GeoAssetMapToolbar
        filters={filters}
        categories={projection.categories}
        onFiltersChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {saveError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
          {saveError}
        </div>
      ) : null}

      {filteredPoints.length === 0 && projection.points.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          当前筛选条件下没有匹配的地图资产，请调整筛选条件。
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AmapAssetCanvas
          config={mapConfigQuery.data}
          points={filteredPoints}
          selectedPointIds={selectedPointIds}
          assignmentTargetName={assignmentTarget?.item.name ?? null}
          onSelectPoints={(pointIds) => {
            setAssignmentTargetId(null);
            setSelectedPointIds(pointIds);
          }}
          onCoordinateChosen={handleCoordinateChosen}
        />
        <div className="xl:sticky xl:top-28">
          <GeoAssetMapSidebar
            selectedPoints={selectedPoints}
            unmappedLocations={projection.unmappedLocations}
            assignmentTarget={assignmentTarget}
            canEdit={canEdit}
            onAssignLocation={(location) => handleAssignLocation(location.id)}
            onCancelAssignment={() => setAssignmentTargetId(null)}
            onSaveCoordinate={handleCoordinateChosen}
            onViewDetails={(node) => navigate(resolveItemDetailPath(node.item))}
          />
        </div>
      </div>
    </div>
  );
}

function MapConfigurationLoading() {
  return (
    <div className="flex min-h-[460px] items-center justify-center rounded-3xl border border-slate-200 bg-white" role="status">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-slate-600">正在读取地图配置...</p>
      </div>
    </div>
  );
}

function MapConfigurationMessage({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof KeyRound;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-14 text-center" role="status">
      <Icon size={32} className="mx-auto text-amber-700" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-bold text-amber-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-amber-900">{description}</p>
    </section>
  );
}
