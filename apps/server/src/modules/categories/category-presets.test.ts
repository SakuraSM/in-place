import { describe, expect, it } from 'vitest';
import {
  categoryIdentity,
  DEFAULT_CATEGORY_PRESETS,
  itemTypeForCategoryScope,
} from './category-presets.js';

describe('category presets', () => {
  it('provides the agreed compact preset catalog without duplicate keys or identities', () => {
    expect(DEFAULT_CATEGORY_PRESETS).toHaveLength(21);
    expect(new Set(DEFAULT_CATEGORY_PRESETS.map((preset) => preset.key)).size).toBe(21);
    expect(new Set(DEFAULT_CATEGORY_PRESETS.map(
      (preset) => categoryIdentity(preset.scope, preset.name),
    )).size).toBe(21);
    expect(DEFAULT_CATEGORY_PRESETS.filter((preset) => preset.scope === 'location')).toHaveLength(5);
    expect(DEFAULT_CATEGORY_PRESETS.filter((preset) => preset.scope === 'container')).toHaveLength(6);
    expect(DEFAULT_CATEGORY_PRESETS.filter((preset) => preset.scope === 'item')).toHaveLength(10);
  });

  it('keeps location and storage on the container inventory type', () => {
    expect(itemTypeForCategoryScope('location')).toBe('container');
    expect(itemTypeForCategoryScope('container')).toBe('container');
    expect(itemTypeForCategoryScope('item')).toBe('item');
  });
});
