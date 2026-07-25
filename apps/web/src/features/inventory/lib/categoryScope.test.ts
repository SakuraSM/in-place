import { describe, expect, it } from 'vitest';
import { getFormCategoryScope, getItemCategoryScope } from './categoryScope';

describe('category scope', () => {
  it('resolves location and storage independently while keeping their inventory type', () => {
    expect(getItemCategoryScope({ type: 'container', metadata: { location_tag: true } })).toBe('location');
    expect(getItemCategoryScope({ type: 'container', metadata: {} })).toBe('container');
    expect(getItemCategoryScope({ type: 'item', metadata: { location_tag: true } })).toBe('item');
  });

  it('resolves form scope from type and location state', () => {
    expect(getFormCategoryScope('container', true)).toBe('location');
    expect(getFormCategoryScope('container', false)).toBe('container');
    expect(getFormCategoryScope('item', true)).toBe('item');
  });
});
