import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_PRESET_ARTWORK,
  getCategoryPresetLegacyIcon,
  resolveCategoryVisual,
} from '@inplace/ui/category-artwork';
import { CategoryIcon } from './categoryPresentation';

describe('category preset artwork', () => {
  it('defines 21 unique preset keys and asset stems', () => {
    const entries = Object.entries(CATEGORY_PRESET_ARTWORK);
    expect(entries).toHaveLength(21);
    expect(new Set(entries.map(([, preset]) => preset.assetStem)).size).toBe(21);
  });

  it('uses artwork only while the legacy default icon is still selected', () => {
    expect(resolveCategoryVisual({
      presetKey: 'location.apartment',
      icon: 'Building2',
    }).kind).toBe('preset');
    expect(resolveCategoryVisual({
      presetKey: 'location.apartment',
      icon: 'Home',
    })).toEqual({ kind: 'lucide', icon: 'Home' });
    expect(resolveCategoryVisual({
      presetKey: 'location.apartment',
      icon: '/api/uploads/custom.webp',
    })).toEqual({ kind: 'customImage', uri: '/api/uploads/custom.webp' });
  });

  it('falls back for unknown presets and exposes the restore icon', () => {
    expect(resolveCategoryVisual({ presetKey: 'unknown', icon: 'Box' })).toEqual({ kind: 'lucide', icon: 'Box' });
    expect(getCategoryPresetLegacyIcon('item.health')).toBe('Pill');
    expect(getCategoryPresetLegacyIcon('unknown')).toBeNull();
  });

  it('falls back to the legacy icon when a Web artwork fails to load', () => {
    const { container } = render(
      <CategoryIcon presetKey="location.apartment" icon="Building2" />,
    );
    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    if (!image) throw new Error('expected preset artwork image');
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
