import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import type { AmapRuntimeConfig } from '../api/mapApi';
import type {
  AssetGeoLocation,
  GeoAssetMapPoint,
} from '../lib/geoAssetMap';
import {
  loadAmapSdk,
  reverseGeocode,
  type AmapSdkNamespace,
} from '../lib/amapSdk';

interface AmapAssetCanvasProps {
  config: AmapRuntimeConfig;
  points: GeoAssetMapPoint[];
  selectedPointId: string | null;
  assignmentTargetName: string | null;
  onSelectPoint: (pointId: string) => void;
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

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readMapClickCoordinate(event: unknown): AssetGeoLocation | null {
  if (!isUnknownRecord(event) || !isUnknownRecord(event.lnglat)) {
    return null;
  }

  const getLongitude = event.lnglat.getLng;
  const getLatitude = event.lnglat.getLat;
  if (typeof getLongitude !== 'function' || typeof getLatitude !== 'function') {
    return null;
  }

  const longitude: unknown = getLongitude.call(event.lnglat);
  const latitude: unknown = getLatitude.call(event.lnglat);
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return null;
  }

  return { longitude, latitude, address: '' };
}

function createMarkerElement(point: GeoAssetMapPoint): HTMLButtonElement {
  const markerButton = document.createElement('button');
  markerButton.type = 'button';
  markerButton.className = 'geo-asset-marker';
  markerButton.dataset.pointId = point.id;
  markerButton.setAttribute(
    'aria-label',
    `${point.sourceNode.item.name}，${point.metrics.assetCount} 项资产`,
  );

  const count = document.createElement('span');
  count.className = 'geo-asset-marker__count';
  const countValue = document.createElement('span');
  countValue.className = 'geo-asset-marker__count-value';
  countValue.textContent = String(point.metrics.assetCount);
  count.append(countValue);
  markerButton.append(count);

  const label = document.createElement('span');
  label.className = 'geo-asset-marker__label';
  label.textContent = point.sourceNode.item.name;
  markerButton.append(label);
  return markerButton;
}

export default function AmapAssetCanvas({
  config,
  points,
  selectedPointId,
  assignmentTargetName,
  onSelectPoint,
  onCoordinateChosen,
}: AmapAssetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const namespaceRef = useRef<AmapSdkNamespace | null>(null);
  const markersRef = useRef<AMap.Marker[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const assignmentTargetNameRef = useRef(assignmentTargetName);
  const onCoordinateChosenRef = useRef(onCoordinateChosen);
  const onSelectPointRef = useRef(onSelectPoint);
  const isChoosingCoordinateRef = useRef(false);
  const [loadStatus, setLoadStatus] = useState<MapLoadStatus>('loading');
  const [interactionError, setInteractionError] = useState<string | null>(null);

  assignmentTargetNameRef.current = assignmentTargetName;
  onCoordinateChosenRef.current = onCoordinateChosen;
  onSelectPointRef.current = onSelectPoint;

  useEffect(() => {
    let isDisposed = false;
    let initializedMap: AMap.Map | null = null;

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
          try {
            const address = await reverseGeocode(namespace, coordinate);
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
      initializedMap?.destroy();
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

    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
    }
    markersRef.current = [];
    markerElementsRef.current = new Map();

    const nextMarkers = points.map((point) => {
      const markerElement = createMarkerElement(point);
      markerElement.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectPointRef.current(point.id);
      });
      markerElementsRef.current.set(point.id, markerElement);
      return new namespace.Marker({
        map,
        position: [
          point.coordinate.longitude,
          point.coordinate.latitude,
        ],
        content: markerElement,
        anchor: 'bottom-center',
        title: point.sourceNode.item.name,
      });
    });
    markersRef.current = nextMarkers;

    if (nextMarkers.length === 1 && points[0]) {
      map.setZoomAndCenter(
        SINGLE_POINT_ZOOM,
        [points[0].coordinate.longitude, points[0].coordinate.latitude],
      );
    } else if (nextMarkers.length > 1) {
      map.setFitView(nextMarkers, false, MAP_FIT_PADDING, MAX_FIT_VIEW_ZOOM);
    } else {
      map.setZoomAndCenter(DEFAULT_MAP_ZOOM, DEFAULT_MAP_CENTER);
    }
  }, [loadStatus, points]);

  useEffect(() => {
    for (const [pointId, markerElement] of markerElementsRef.current) {
      markerElement.classList.toggle(
        'geo-asset-marker--selected',
        pointId === selectedPointId,
      );
    }

    const selectedPoint = points.find((point) => point.id === selectedPointId);
    if (selectedPoint) {
      mapRef.current?.setCenter([
        selectedPoint.coordinate.longitude,
        selectedPoint.coordinate.latitude,
      ]);
    }
  }, [points, selectedPointId]);

  return (
    <section
      className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner"
      aria-label="真实地理资产地图"
    >
      <div ref={containerRef} className="h-[620px] min-h-[520px] w-full" />

      {loadStatus === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90" role="status">
          <div className="text-center text-slate-600">
            <Loader2 className="mx-auto animate-spin" size={28} aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">正在加载高德地图...</p>
          </div>
        </div>
      ) : null}

      {loadStatus === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 px-6" role="alert">
          <div className="max-w-sm text-center">
            <MapPin className="mx-auto text-rose-500" size={30} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-slate-950">地图加载失败</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              请检查高德 Key、域名白名单和服务端安全代理配置。
            </p>
          </div>
        </div>
      ) : null}

      {assignmentTargetName ? (
        <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-3 rounded-2xl border border-brand/30 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:right-auto">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brandTint text-brandStrong">
            <Crosshair size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">
              在地图上点击“{assignmentTargetName}”的位置
            </p>
            <p className="mt-0.5 text-xs text-slate-600">选点后会自动识别地址并保存</p>
          </div>
        </div>
      ) : null}

      {interactionError ? (
        <div className="absolute bottom-4 left-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="alert">
          {interactionError}
        </div>
      ) : null}
    </section>
  );
}
