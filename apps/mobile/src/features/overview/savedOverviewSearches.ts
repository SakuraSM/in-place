import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InventoryFilterState } from '@inplace/app-core';

export interface SavedOverviewSearch {
  id: string;
  name: string;
  filters: InventoryFilterState;
  createdAt: string;
}

const STORAGE_KEY = 'inplace.overview.saved-searches.v1';
const MAX_SAVED_SEARCHES = 10;

function isSavedOverviewSearch(value: unknown): value is SavedOverviewSearch {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedOverviewSearch>;
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.createdAt === 'string'
    && Boolean(candidate.filters);
}

export async function loadSavedOverviewSearches(): Promise<SavedOverviewSearch[]> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedValue) return [];

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue.filter(isSavedOverviewSearch).slice(0, MAX_SAVED_SEARCHES) : [];
  } catch {
    return [];
  }
}

export async function saveOverviewSearch(
  name: string,
  filters: InventoryFilterState,
): Promise<SavedOverviewSearch[]> {
  const currentSearches = await loadSavedOverviewSearches();
  const savedSearch: SavedOverviewSearch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    filters,
    createdAt: new Date().toISOString(),
  };
  const nextSearches = [
    savedSearch,
    ...currentSearches.filter((search) => search.name !== savedSearch.name),
  ].slice(0, MAX_SAVED_SEARCHES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSearches));
  return nextSearches;
}

export async function deleteOverviewSearch(id: string): Promise<SavedOverviewSearch[]> {
  const currentSearches = await loadSavedOverviewSearches();
  const nextSearches = currentSearches.filter((search) => search.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSearches));
  return nextSearches;
}
