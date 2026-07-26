import { describe, expect, it } from 'vitest';
import { collectDescendantIds } from './stocktake.repository.js';

describe('stocktake hierarchy snapshot', () => {
  it('includes all nested descendants exactly once', () => {
    const rows = [
      { id: 'room', parentId: null },
      { id: 'cabinet', parentId: 'room' },
      { id: 'drawer', parentId: 'cabinet' },
      { id: 'item', parentId: 'drawer' },
    ];
    expect(new Set(collectDescendantIds('room', rows))).toEqual(new Set(['cabinet', 'drawer', 'item']));
  });

  it('does not loop forever on malformed cycles', () => {
    const rows = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ];
    expect(new Set(collectDescendantIds('a', rows))).toEqual(new Set(['b']));
  });
});
