import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Item } from '@inplace/domain';
import InventoryDetailGallery from './InventoryDetailGallery';

vi.mock('./InventoryArtwork', () => ({ default: () => null }));

describe('InventoryDetailGallery', () => {
  it('shows an existing image when the selected image has been removed', () => {
    const item = { name: '测试物品', type: 'item', images: ['https://example.test/first.png', 'https://example.test/second.png'] } as Item;
    const { rerender } = render(<InventoryDetailGallery item={item} activeImageIndex={1} onSelectImage={vi.fn()} />);
    expect(screen.getAllByAltText('测试物品')[0]).toHaveAttribute('src', 'https://example.test/second.png');

    rerender(<InventoryDetailGallery item={{ ...item, images: [item.images[0]] }} activeImageIndex={1} onSelectImage={vi.fn()} />);
    for (const image of screen.getAllByAltText('测试物品')) {
      expect(image).toHaveAttribute('src', 'https://example.test/first.png');
    }
  });
});
