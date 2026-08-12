import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MapPin } from 'lucide-react';
import {
  parseNativeToMobileMapMessage,
  type AssetGeoLocation,
  type MobileMapPoint,
  type MobileMapToNativeMessage,
  type NativeToMobileMapMessage,
} from '@inplace/app-core';
import { fetchMapRuntimeConfig } from '../api/mapApi';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import {
  loadAmapSdk,
  resolveAmapClusterData,
  reverseGeocode,
  type AmapClusterDatum,
  type AmapMarkerClusterInstance,
  type AmapSdkNamespace,
} from '../lib/amapSdk';
import { clearMarkerIconRoots } from '../components/amapAssetCanvasPresentation';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

const DEFAULT_MAP_CENTER: [number, number] = [104.195397, 35.86166];
const DEFAULT_MAP_ZOOM = 4;
const SINGLE_POINT_ZOOM = 13;
const MOBILE_MAP_MESSAGE_EVENT = 'inplace:mobile-map-message';
const MAP_LOAD_TIMEOUT_MS = 20_000;

interface MapBridgeEvent extends CustomEvent<unknown> {
  detail: unknown;
}

function postToNative(message: MobileMapToNativeMessage): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

function readBridgePayload(event: Event): unknown {
  if (event instanceof MessageEvent) {
    try {
      return typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
      return null;
    }
  }
  return (event as MapBridgeEvent).detail;
}

export default function MobileMapCanvasPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const namespaceRef = useRef<AmapSdkNamespace | null>(null);
  const clusterRef = useRef<AmapMarkerClusterInstance | null>(null);
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const iconRootsRef = useRef<Map<string, Root>>(new Map());
  const pointsRef = useRef<MobileMapPoint[]>([]);
  const coordinateTargetRef = useRef<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [coordinateTargetName, setCoordinateTargetName] = useState<string | null>(null);

  const clearMarkers = useCallback(() => {
    clusterRef.current?.setMap(null);
    clusterRef.current = null;
    markerElementsRef.current.clear();
    clearMarkerIconRoots(iconRootsRef.current);
  }, []);

  const setSelectedMarkers = useCallback((pointIds: string[]) => {
    const selectedIds = new Set(pointIds);
    for (const [pointId, element] of markerElementsRef.current) {
      element.classList.toggle('geo-asset-marker--selected', selectedIds.has(pointId));
    }
  }, []);

  const renderPoints = useCallback((points: MobileMapPoint[]) => {
    const map = mapRef.current;
    const namespace = namespaceRef.current;
    if (!map || !namespace) return;
    clearMarkers();
    pointsRef.current = points;
    const pointsById = new Map(points.map((point) => [point.id, point]));
    const clusterData: AmapClusterDatum[] = points.map((point) => ({
      lnglat: [point.longitude, point.latitude],
      pointId: point.id,
      assetCount: point.assetCount,
    }));
    const createPointElement = (point: MobileMapPoint) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'geo-asset-marker';
      button.setAttribute('aria-label', `${point.name}，${point.assetCount} 项资产`);
      const iconFrame = document.createElement('span');
      iconFrame.className = 'geo-asset-marker__icon';
      const colorClasses = getColorClasses(point.color);
      iconFrame.classList.add(...colorClasses.bg.split(' '), ...colorClasses.text.split(' '));
      const iconMount = document.createElement('span');
      iconMount.className = 'geo-asset-marker__icon-content';
      const iconRoot = createRoot(iconMount);
      iconRoot.render(<CategoryIcon icon={point.icon} presetKey={point.presetKey} fallback={MapPin} size={23} className="geo-asset-marker__fallback-icon" imageClassName="geo-asset-marker__icon-image" />);
      iconRootsRef.current.set(point.id, iconRoot);
      const count = document.createElement('span');
      count.className = 'geo-asset-marker__count';
      count.textContent = String(point.assetCount);
      iconFrame.append(iconMount, count);
      const label = document.createElement('span');
      label.className = 'geo-asset-marker__label';
      label.textContent = point.name;
      button.append(iconFrame, label);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelectedMarkers([point.id]);
        postToNative({ type: 'select-points', pointIds: [point.id] });
      });
      return button;
    };
    clusterRef.current = new namespace.MarkerCluster(map, clusterData, {
      gridSize: 60,
      maxZoom: 18,
      zoomOnClick: false,
      averageCenter: true,
      renderMarker: (context) => {
        const datum = resolveAmapClusterData(context, clusterData)[0];
        const point = datum ? pointsById.get(datum.pointId) : null;
        if (!point) return;
        const element = createPointElement(point);
        markerElementsRef.current.set(point.id, element);
        context.marker.setContent(element);
        context.marker.setAnchor('bottom-center');
      },
      renderClusterMarker: (context) => {
        const data = resolveAmapClusterData(context, clusterData);
        const pointIds = data.map((datum) => datum.pointId);
        const assetCount = pointIds.reduce((countValue, pointId) => countValue + (pointsById.get(pointId)?.assetCount ?? 0), 0);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'geo-asset-cluster';
        button.setAttribute('aria-label', `${pointIds.length} 个位置，${assetCount} 项资产`);
        const count = document.createElement('span');
        count.className = 'geo-asset-cluster__count';
        count.textContent = String(assetCount);
        const label = document.createElement('span');
        label.className = 'geo-asset-cluster__label';
        label.textContent = `${pointIds.length} 个位置`;
        button.append(count, label);
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          postToNative({ type: 'select-points', pointIds });
        });
        context.marker.setContent(button);
        context.marker.setAnchor('center');
      },
    });
    if (points.length === 0) {
      map.setZoomAndCenter(DEFAULT_MAP_ZOOM, DEFAULT_MAP_CENTER);
    }
    if (points.length === 1) {
      map.setZoomAndCenter(SINGLE_POINT_ZOOM, [points[0].longitude, points[0].latitude]);
    } else if (points.length > 1) {
      const longitudes = points.map((point) => point.longitude);
      const latitudes = points.map((point) => point.latitude);
      map.setBounds(
        new namespace.Bounds([Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]),
        true,
        [40, 40, 40, 40],
      );
      if (map.getZoom() > 13) map.setZoom(13, true);
    }
  }, [clearMarkers, setSelectedMarkers]);

  const handleBridgeMessage = useCallback((message: NativeToMobileMapMessage) => {
    if (message.type === 'initialize') {
      renderPoints(message.points);
      setSelectedMarkers(message.selectedPointIds);
      return;
    }
    if (message.type === 'update-points') {
      renderPoints(message.points);
      return;
    }
    if (message.type === 'select-points') {
      setSelectedMarkers(message.pointIds);
      const selectedPoint = pointsRef.current.find((point) => message.pointIds.includes(point.id));
      if (selectedPoint) mapRef.current?.setZoomAndCenter(SINGLE_POINT_ZOOM, [selectedPoint.longitude, selectedPoint.latitude]);
      return;
    }
    coordinateTargetRef.current = message.targetId && message.targetName
      ? { id: message.targetId, name: message.targetName }
      : null;
    setCoordinateTargetName(message.targetName);
  }, [renderPoints, setSelectedMarkers]);

  useEffect(() => {
    const receiveMessage = (event: Event) => {
      const message = parseNativeToMobileMapMessage(readBridgePayload(event));
      if (message) handleBridgeMessage(message);
    };
    window.addEventListener('message', receiveMessage);
    document.addEventListener('message', receiveMessage);
    window.addEventListener(MOBILE_MAP_MESSAGE_EVENT, receiveMessage);
    return () => {
      window.removeEventListener('message', receiveMessage);
      document.removeEventListener('message', receiveMessage);
      window.removeEventListener(MOBILE_MAP_MESSAGE_EVENT, receiveMessage);
    };
  }, [handleBridgeMessage]);

  useEffect(() => {
    let isDisposed = false;
    const initialize = async () => {
      try {
        const config = await fetchMapRuntimeConfig();
        if (!config.enabled) throw new Error('地图服务尚未配置');
        const namespace = await Promise.race([
          loadAmapSdk(config),
          new Promise<never>((_, reject) => {
            globalThis.setTimeout(() => reject(new Error('地图服务连接超时')), MAP_LOAD_TIMEOUT_MS);
          }),
        ]);
        if (isDisposed || !containerRef.current) return;
        namespaceRef.current = namespace;
        const map = new namespace.Map(containerRef.current, {
          viewMode: '2D',
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          mapStyle: 'amap://styles/whitesmoke',
          showIndoorMap: false,
        });
        mapRef.current = map;
        map.addControl(new namespace.Scale());
        map.addControl(new namespace.ToolBar({ position: 'LB' }));
        map.on('click', async (event: unknown) => {
          const target = coordinateTargetRef.current;
          if (!target || !event || typeof event !== 'object' || !('lnglat' in event)) return;
          const lnglat = (event as { lnglat?: AMap.LngLat }).lnglat;
          if (!lnglat) return;
          const coordinate: AssetGeoLocation = {
            longitude: lnglat.getLng(),
            latitude: lnglat.getLat(),
            address: '',
          };
          try {
            coordinate.address = await reverseGeocode(namespace, coordinate);
            postToNative({ type: 'choose-coordinate', coordinate });
          } catch {
            postToNative({ type: 'error', code: 'REVERSE_GEOCODE_FAILED', message: '地址识别失败，请重试' });
          }
        });
        setStatus('ready');
        postToNative({ type: 'ready' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '地图加载失败';
        setStatus('error');
        postToNative({ type: 'error', code: 'MAP_LOAD_FAILED', message });
      }
    };
    void initialize();
    return () => {
      isDisposed = true;
      clearMarkers();
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [clearMarkers]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-50" aria-label="归位资产地图">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' ? <MapStatus text="正在加载高德地图…" /> : null}
      {status === 'error' ? <MapStatus text="地图加载失败，请检查服务配置" danger /> : null}
      {coordinateTargetName ? (
        <div className="absolute left-3 right-3 top-3 rounded-2xl border border-brand/30 bg-white/95 px-4 py-3 text-sm font-bold text-slate-900 shadow-lg">
          点击地图标注“{coordinateTargetName}”
        </div>
      ) : null}
    </main>
  );
}

function MapStatus({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/95 px-6" role={danger ? 'alert' : 'status'}>
      <p className={danger ? 'text-sm font-bold text-rose-700' : 'text-sm font-semibold text-slate-600'}>{text}</p>
    </div>
  );
}
