import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  buildGeoAssetMapProjection,
  DEFAULT_GEO_ASSET_MAP_FILTERS,
  filterGeoAssetMapPoints,
  toMobileMapPoints,
  updateAssetGeoLocationMetadata,
  type AssetGeoLocation,
  type GeoAssetMapFilters,
  type MobileMapPoint,
} from '@inplace/app-core';
import type { Item } from '@inplace/domain';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { categoriesApi, itemsApi } from '@/shared/api/mobileClient';
import { fetchAllMobileItems } from '@/shared/api/fetchAllMobileItems';

export interface PendingCoordinate {
  item: Item;
  coordinate: AssetGeoLocation;
}

export function useMobileAssetMap() {
  const { user } = useAuth();
  const { currentHouseholdId, canEditInventory } = useHousehold();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<GeoAssetMapFilters>(DEFAULT_GEO_ASSET_MAP_FILTERS);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [assignmentTarget, setAssignmentTarget] = useState<Item | null>(null);
  const [pendingCoordinate, setPendingCoordinate] = useState<PendingCoordinate | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['mobile', 'location-map-items', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    queryFn: () => fetchAllMobileItems(user!.id),
  });
  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'location-map-categories', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    queryFn: () => categoriesApi.fetchCategories(user!.id, 'location'),
  });
  const projection = useMemo(
    () => buildGeoAssetMapProjection(itemsQuery.data ?? []),
    [itemsQuery.data],
  );
  const filteredPoints = useMemo(
    () => filterGeoAssetMapPoints(projection, filters),
    [filters, projection],
  );
  const categoryPresentation = useMemo(() => new Map(
    (categoriesQuery.data ?? []).map((category) => [category.name, {
      presetKey: category.preset_key,
      icon: category.icon,
      color: category.color,
    }]),
  ), [categoriesQuery.data]);
  const mapPoints = useMemo<MobileMapPoint[]>(
    () => toMobileMapPoints(filteredPoints, categoryPresentation),
    [categoryPresentation, filteredPoints],
  );
  const filteredPointsById = useMemo(
    () => new Map(filteredPoints.map((point) => [point.id, point])),
    [filteredPoints],
  );
  const selectedPoints = selectedPointIds.flatMap((pointId) => {
    const point = filteredPointsById.get(pointId);
    return point ? [point] : [];
  });

  const coordinateMutation = useMutation({
    mutationFn: async ({ item, coordinate }: PendingCoordinate) => itemsApi.updateItem(item.id, {
      metadata: updateAssetGeoLocationMetadata(item.metadata, coordinate),
    }),
    onSuccess: async () => {
      setPendingCoordinate(null);
      setAssignmentTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'location-map-items', currentHouseholdId] });
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'locations', currentHouseholdId] });
    },
  });

  return {
    user,
    currentHouseholdId,
    canEditInventory,
    itemsQuery,
    categoriesQuery,
    projection,
    filters,
    setFilters,
    mapPoints,
    selectedPointIds,
    setSelectedPointIds,
    selectedPoints,
    assignmentTarget,
    setAssignmentTarget,
    pendingCoordinate,
    setPendingCoordinate,
    coordinateMutation,
  };
}
