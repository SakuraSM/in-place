import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteOverviewSearch,
  loadSavedOverviewSearches,
  saveOverviewSearch,
} from '../savedOverviewSearches';

const scope = { server: 'https://test/api', userId: 'user', householdId: 'family' };

const FILTERS = {
  q: '相机',
  type: 'item' as const,
  status: 'in_stock' as const,
  locationId: 'location-1',
  tags: ['数码'],
  view: 'flat' as const,
};

describe('saved overview searches', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round trips filters and deletes a saved search', async () => {
    const saved = await saveOverviewSearch('数码库存', FILTERS, scope);
    expect(saved[0]).toMatchObject({ name: '数码库存', filters: FILTERS });
    expect(await loadSavedOverviewSearches(scope)).toHaveLength(1);

    await deleteOverviewSearch(saved[0].id, scope);
    expect(await loadSavedOverviewSearches(scope)).toEqual([]);
  });

  it('keeps at most ten saved searches', async () => {
    for (let index = 0; index < 12; index += 1) {
      await saveOverviewSearch(`筛选 ${index}`, { ...FILTERS, q: `${index}` }, scope);
    }

    const saved = await loadSavedOverviewSearches(scope);
    expect(saved).toHaveLength(10);
    expect(saved[0].name).toBe('筛选 11');
  });
});

it('keeps saved filters isolated and rejects malformed persisted entries', async () => {
  await AsyncStorage.clear();
  await saveOverviewSearch('家庭一', FILTERS, scope);
  expect(await loadSavedOverviewSearches({ ...scope, householdId: 'other' })).toEqual([]);
  expect(await loadSavedOverviewSearches({ ...scope, server: 'https://other/api' })).toEqual([]);
  expect(await loadSavedOverviewSearches({ ...scope, userId: 'other' })).toEqual([]);
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.setItem(keys[0], JSON.stringify([{ id: 'bad', name: '坏数据', createdAt: '', filters: { tags: 3 } }]));
  expect(await loadSavedOverviewSearches(scope)).toEqual([]);
});
