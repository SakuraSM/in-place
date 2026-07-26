import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteOverviewSearch,
  loadSavedOverviewSearches,
  saveOverviewSearch,
} from '../savedOverviewSearches';

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
    const saved = await saveOverviewSearch('数码库存', FILTERS);
    expect(saved[0]).toMatchObject({ name: '数码库存', filters: FILTERS });
    expect(await loadSavedOverviewSearches()).toHaveLength(1);

    await deleteOverviewSearch(saved[0].id);
    expect(await loadSavedOverviewSearches()).toEqual([]);
  });

  it('keeps at most ten saved searches', async () => {
    for (let index = 0; index < 12; index += 1) {
      await saveOverviewSearch(`筛选 ${index}`, { ...FILTERS, q: `${index}` });
    }

    const saved = await loadSavedOverviewSearches();
    expect(saved).toHaveLength(10);
    expect(saved[0].name).toBe('筛选 11');
  });
});
