import { createRoot, type Root } from 'react-dom/client';
import { MapPin } from 'lucide-react';
import type { Category } from '@inplace/domain';
import type { AssetGeoLocation, GeoAssetMapPoint } from '../lib/geoAssetMap';
import {
  resolveAmapClusterData,
  type AmapClusterDatum,
  type AmapClusterRenderContext,
} from '../lib/amapSdk';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';

interface MarkerElementOptions {
  point: GeoAssetMapPoint;
  category: Category | null;
  onSelect: (pointIds: string[]) => void;
}

interface ClusterElementOptions {
  context: AmapClusterRenderContext;
  allData: AmapClusterDatum[];
  pointsById: Map<string, GeoAssetMapPoint>;
  onSelect: (pointIds: string[]) => void;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readMapClickCoordinate(event: unknown): AssetGeoLocation | null {
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

export function createMarkerElement({
  point,
  category,
  onSelect,
}: MarkerElementOptions): { element: HTMLButtonElement; iconRoot: Root } {
  const markerButton = document.createElement('button');
  markerButton.type = 'button';
  markerButton.className = 'geo-asset-marker';
  markerButton.dataset.pointId = point.id;
  markerButton.setAttribute(
    'aria-label',
    `${point.sourceNode.item.name}，${point.metrics.assetCount} 项资产`,
  );
  markerButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onSelect([point.id]);
  });

  const iconFrame = document.createElement('span');
  iconFrame.className = 'geo-asset-marker__icon';
  if (category) {
    const colorClasses = getColorClasses(category.color);
    iconFrame.classList.add(...colorClasses.bg.split(' '), ...colorClasses.text.split(' '));
  }
  const iconMount = document.createElement('span');
  iconMount.className = 'geo-asset-marker__icon-content';
  const iconRoot = createRoot(iconMount);
  iconRoot.render(category ? (
    <CategoryIcon
      icon={category.icon}
      presetKey={category.preset_key}
      fallback={MapPin}
      size={23}
      className="geo-asset-marker__fallback-icon"
      imageClassName="geo-asset-marker__icon-image"
    />
  ) : (
    <MapPin className="geo-asset-marker__fallback-icon" size={23} aria-hidden="true" />
  ));

  const count = document.createElement('span');
  count.className = 'geo-asset-marker__count';
  count.textContent = String(point.metrics.assetCount);
  count.setAttribute('aria-hidden', 'true');
  iconFrame.append(iconMount, count);
  markerButton.append(iconFrame);

  const label = document.createElement('span');
  label.className = 'geo-asset-marker__label';
  label.textContent = point.sourceNode.item.name;
  markerButton.append(label);
  return { element: markerButton, iconRoot };
}

export function resolvePointCategory(
  point: GeoAssetMapPoint,
  categories: Category[],
): Category | null {
  const categoryName = point.sourceNode.item.category.trim();
  if (!categoryName) {
    return null;
  }

  return categories.find((category) => (
    category.scope === 'location' && category.name === categoryName
  )) ?? null;
}

export function createClusterElement({
  context,
  allData,
  pointsById,
  onSelect,
}: ClusterElementOptions): HTMLButtonElement {
  const clusterData = resolveAmapClusterData(context, allData);
  const pointIds = clusterData.map((datum) => datum.pointId);
  const locationCount = context.count ?? pointIds.length;
  const assetCount = pointIds.reduce(
    (count, pointId) => count + (pointsById.get(pointId)?.metrics.assetCount ?? 0),
    0,
  );
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'geo-asset-cluster';
  button.setAttribute('aria-label', `${locationCount} 个位置，${assetCount} 项资产`);
  button.innerHTML = `<span class="geo-asset-cluster__count">${assetCount}</span><span class="geo-asset-cluster__label">${locationCount} 个位置</span>`;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onSelect(pointIds);
  });
  return button;
}

export function deferRootUnmount(root: Root): void {
  // Marker icons are nested React roots owned by the map SDK. Unmounting one
  // synchronously while the parent tree is committing triggers a React race
  // warning, so release it immediately after the current render completes.
  globalThis.setTimeout(() => root.unmount(), 0);
}

export function clearMarkerIconRoots(roots: Map<string, Root>): void {
  const rootsToUnmount = [...roots.values()];
  roots.clear();
  for (const root of rootsToUnmount) {
    deferRootUnmount(root);
  }
}

export function calculatePointBounds(
  points: GeoAssetMapPoint[],
): [[number, number], [number, number]] | null {
  const firstPoint = points[0];
  if (!firstPoint) {
    return null;
  }
  let west = firstPoint.coordinate.longitude;
  let east = west;
  let south = firstPoint.coordinate.latitude;
  let north = south;
  for (const point of points.slice(1)) {
    west = Math.min(west, point.coordinate.longitude);
    east = Math.max(east, point.coordinate.longitude);
    south = Math.min(south, point.coordinate.latitude);
    north = Math.max(north, point.coordinate.latitude);
  }
  return [[west, south], [east, north]];
}
