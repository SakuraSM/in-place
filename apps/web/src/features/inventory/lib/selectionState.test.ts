import { describe, expect, it } from 'vitest';
import { toggleSelectAllIds, toggleSelectionId } from './selectionState';

describe('home selection state', () => {
  it('selects and deselects one item', () => {
    expect(toggleSelectionId([], 'a')).toEqual(['a']);
    expect(toggleSelectionId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('selects all and clears when everything is selected', () => {
    expect(toggleSelectAllIds([], ['a', 'b'])).toEqual(['a', 'b']);
    expect(toggleSelectAllIds(['a', 'b'], ['a', 'b'])).toEqual([]);
  });
});
