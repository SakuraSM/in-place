import { useEffect, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import type { Category } from '@inplace/domain';
import type { AmapRuntimeConfig } from '../api/mapApi';
import type {
  AssetGeoLocation,
  GeoAssetMapPoint,
} from '../lib/geoAssetMap';
import {
  loadAmapSdk,
  resolveAmapClusterData,
  reverseGeocode,
  type AmapClusterDatum,
  type AmapMarkerClusterInstance,
  type AmapSdkNamespace,
} from '../lib/amapSdk';
import {
  calculatePointBounds,
  clearMarkerIconRoots,
  createClusterElement,
  createMarkerElement,
  deferRootUnmount,
  readMapClickCoordinate,
  resolvePointCategory,
} from './amapAssetCanvasPresentation';
import AmapAssetCanvasOverlays from './AmapAssetCanvasOverlays';

interface AmapAssetCanvasProps {
  config: AmapRuntimeConfig;
  points: GeoAssetMapPoint[];
  categories: Category[];
  selectedPointIds: string[];
  assignmentTargetName: string | null;
  onSelectPoints: (pointIds: string[]) => void;
  onCoordinateChosen: (coordinate: AssetGeoLocation) => Promise<void>;
}

type MapLoadStatus = 'loading' | 'ready' | 'error';

const DEFAULT_MAP_CENTER_LONGITUDE = 104.195397;
const DEFAULT_MAP_CENTER_LATITUDE = 35.86166;
const DEFAULT_MAP_CENTER: [number, number] = [
  DEFAULT_MAP_CENTER_LONGITUDE,
  DEFAULT_MAP_CENTER_LATITUDE,
];
const DEFAULT_MAP_ZOOM = 4;
const SINGLE_POINT_ZOOM = 13;
const MAX_FIT_VIEW_ZOOM = 13;
const MAP_FIT_PADDING_SIZE = 80;
const MAP_FIT_PADDING = [
  MAP_FIT_PADDING_SIZE,
  MAP_FIT_PADDING_SIZE,
  MAP_FIT_PADDING_SIZE,
  MAP_FIT_PADDING_SIZE,
];

export default function AmapAssetCanvas({
  config,
  points,
  categories,
  selectedPointIds,
  assignmentTargetName,
  onSelectPoints,
  onCoordinateChosen,
}: AmapAssetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const namespaceRef = useRef<AmapSdkNamespace | null>(null);
  const clusterRef = useRef<AmapMarkerClusterInstance | null>(null);
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const markerIconRootsRef = useRef<Map<string, Root>>(new Map());
  const assignmentTargetNameRef = useRef(assignmentTargetName);
  const onCoordinateChosenRef = useRef(onCoordinateChosen);
  const onSelectPointsRef = useRef(onSelectPoints);
  const isChoosingCoordinateRef = useRef(false);
  const [loadStatus, setLoadStatus] = useState<MapLoadStatus>('loading');
  const [interactionError, setInteractionError] = useState<string | null>(null);

  assignmentTargetNameRef.current = assignmentTargetName;
  onCoordinateChosenRef.current = onCoordinateChosen;
  onSelectPointsRef.current = onSelectPoints;

  useEffect(() => {
    let isDisposed = false;
    let initializedMap: AMap.Map | null = null;
    const markerIconRoots = markerIconRootsRef.current;

    const initializeMap = async (): Promise<void> => {
      try {
        const namespace = await loadAmapSdk(config);
        if (isDisposed || !containerRef.current) {
          return;
        }

        namespaceRef.current = namespace;
        initializedMap = new namespace.Map(containerRef.current, {
          viewMode: '2D',
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          mapStyle: 'amap://styles/whitesmoke',
          showIndoorMap: false,
        });
        initializedMap.addControl(new namespace.Scale());
        initializedMap.addControl(new namespace.ToolBar({ position: 'LB' }));
        initializedMap.addControl(new namespace.Geolocation({
          position: 'LB',
          enableHighAccuracy: true,
          timeout: 10_000,
          zoomToAccuracy: true,
        }));
        initializedMap.on('click', async (event: unknown) => {
          if (
            !assignmentTargetNameRef.current
            || isChoosingCoordinateRef.current
          ) {
            return;
          }

          const coordinate = readMapClickCoordinate(event);
          if (!coordinate) {
            return;
          }

          isChoosingCoordinateRef.current = true;
          setInteractionError(null);
          let address: string;
          try {
            address = await reverseGeocode(namespace, coordinate);
          } catch {
            setInteractionError('地址识别失败，请稍后重试或手动输入经纬度');
            isChoosingCoordinateRef.current = false;
            return;
          }
          try {
            await onCoordinateChosenRef.current({ ...coordinate, address });
          } catch {
            setInteractionError('坐标保存失败，请稍后重试');
          } finally {
            isChoosingCoordinateRef.current = false;
          }
        });
        mapRef.current = initializedMap;
        setLoadStatus('ready');
      } catch {
        if (!isDisposed) {
          setLoadStatus('error');
        }
      }
    };

    void initializeMap();
    return () => {
      isDisposed = true;
      clearMarkerIconRoots(markerIconRoots);
      initializedMap?.destroy();
      clusterRef.current?.setMap(null);
      clusterRef.current = null;
      mapRef.current = null;
      namespaceRef.current = null;
    };
  }, [config]);

  useEffect(() => {
    const map = mapRef.current;
    const namespace = namespaceRef.current;
    if (loadStatus !== 'ready' || !map || !namespace) {
      return;
    }

    clusterRef.current?.setMap(null);
    clusterRef.current = null;
    clearMarkerIconRoots(markerIconRootsRef.current);
    markerElementsRef.current = new Map();

    const pointsById = new Map(points.map((point) => [point.id, point]));
    const clusterData: AmapClusterDatum[] = points.map((point) => ({
      lnglat: [point.coordinate.longitude, point.coordinate.latitude],
      pointId: point.id,
      assetCount: point.metrics.assetCount,
    }));
    clusterRef.current = new namespace.MarkerCluster(map, clusterData, {
      gridSize: 60,
      maxZoom: 18,
      zoomOnClick: false,
      averageCenter: true,
      renderMarker: (context) => {
        const datum = resolveAmapClusterData(context, clusterData)[0];
        const point = datum ? pointsById.get(datum.pointId) : null;
        if (!point) {
          return;
        }
        const previousIconRoot = markerIconRootsRef.current.get(point.id);
        if (previousIconRoot) {
          markerIconRootsRef.current.delete(point.id);
          deferRootUnmount(previousIconRoot);
        }
        const { element, iconRoot } = createMarkerElement({
          point,
          category: resolvePointCategory(point, categories),
          onSelect: (pointIds) => onSelectPointsRef.current(pointIds),
        });
        markerElementsRef.current.set(point.id, element);
        markerIconRootsRef.current.set(point.id, iconRoot);
        context.marker.setContent(element);
        context.marker.setAnchor('bottom-center');
      },
      renderClusterMarker: (context) => {
        context.marker.setContent(createClusterElement({
          context,
          allData: clusterData,
          pointsById,
          onSelect: (pointIds) => onSelectPointsRef.current(pointIds),
        }));
        context.marker.setAnchor('center');
      },
    });

    if (points.length === 1 && points[0]) {
      map.setZoomAndCenter(
        SINGLE_POINT_ZOOM,
        [points[0].coordinate.longitude, points[0].coordinate.latitude],
      );
    } else if (points.length > 1) {
      const bounds = calculatePointBounds(points);
      if (bounds) {
        map.setBounds(new namespace.Bounds(bounds[0], bounds[1]), true, MAP_FIT_PADDING);
        if (map.getZoom() > MAX_FIT_VIEW_ZOOM) {
          map.setZoom(MAX_FIT_VIEW_ZOOM, true);
        }
      }
    } else {
      map.setZoomAndCenter(DEFAULT_MAP_ZOOM, DEFAULT_MAP_CENTER);
    }

  }, [categories, loadStatus, points]);

  useEffect(() => {
    const selectedPointIdSet = new Set(selectedPointIds);
    for (const [pointId, markerElement] of markerElementsRef.current) {
      markerElement.classList.toggle(
        'geo-asset-marker--selected',
        selectedPointIdSet.has(pointId),
      );
    }

    const selectedPoint = selectedPointIds.length === 1
      ? points.find((point) => point.id === selectedPointIds[0])
      : null;
    if (selectedPoint) {
      mapRef.current?.setCenter([
        selectedPoint.coordinate.longitude,
        selectedPoint.coordinate.latitude,
      ]);
    }
  }, [points, selectedPointIds]);

  const handleKeyboardNavigation = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    if (event.key === 'Escape') {
      onSelectPoints([]);
      return;
    }
    if (points.length === 0) {
      return;
    }
    const currentIndex = selectedPointIds.length === 1
      ? points.findIndex((point) => point.id === selectedPointIds[0])
      : -1;
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + points.length) % points.length;
    const nextPoint = points[nextIndex];
    if (nextPoint) {
      onSelectPoints([nextPoint.id]);
    }
  };

  return (
    <section
      className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner"
      aria-label="真实地理资产地图"
      tabIndex={0}
      onKeyDown={handleKeyboardNavigation}
    >
      <div ref={containerRef} className="h-[620px] min-h-[520px] w-full" />
      <AmapAssetCanvasOverlays
        loadStatus={loadStatus}
        assignmentTargetName={assignmentTargetName}
        interactionError={interactionError}
      />
    </section>
  );
}
