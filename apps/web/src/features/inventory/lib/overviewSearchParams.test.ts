import { describe, expect, it } from 'vitest';
import {
  parseOverviewSearchParams,
  serializeOverviewSearchState,
} from './overviewSearchParams';

describe('overview search params', () => {
  it('parses every public filter and repeated tags', () => {
    const parsed = parseOverviewSearchParams(new URLSearchParams(
      'q=充电器&type=item&status=borrowed&locationId=desk&tag=数码&tag=常用&page=3&pageSize=48',
    ));

    expect(parsed).toEqual({
      q: '充电器',
      type: 'item',
      status: 'borrowed',
      locationId: 'desk',
      tags: ['数码', '常用'],
      page: 3,
      pageSize: 48,
    });
  });

  it('falls back from invalid values and incompatible status filters', () => {
    expect(parseOverviewSearchParams(new URLSearchParams(
      'type=location&status=borrowed&page=-2&pageSize=999',
    ))).toMatchObject({
      type: 'location',
      status: 'all',
      page: 1,
      pageSize: 24,
    });
  });

  it('round-trips a valid state without losing repeated tags', () => {
    const initial = {
      q: '收纳',
      type: 'container' as const,
      status: 'all' as const,
      locationId: 'room-1',
      tags: ['换季', '衣物'],
      page: 2,
      pageSize: 12,
    };

    const serialized = serializeOverviewSearchState(initial);

    expect(serialized.getAll('tag')).toEqual(['换季', '衣物']);
    expect(parseOverviewSearchParams(serialized)).toEqual(initial);
  });
});
