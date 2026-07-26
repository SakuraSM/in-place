import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Category, Item } from '../../../legacy/database.types';
import HomeInventorySections from './HomeInventorySections';

const TEST_CATEGORY: Category = {
  id: 'category-1',
  user_id: 'user-1',
  household_id: 'household-1',
  item_type: 'item',
  scope: 'item',
  preset_key: 'electronics',
  name: '数码电子',
  icon: 'Laptop',
  color: 'violet',
  created_at: '2026-07-26T00:00:00.000Z',
};

const TEST_ITEM: Item = {
  id: 'item-1',
  user_id: 'user-1',
  household_id: 'household-1',
  parent_id: null,
  type: 'item',
  name: '充电器',
  description: '',
  category: TEST_CATEGORY.name,
  price: null,
  quantity: 1,
  tracking_mode: 'unique',
  minimum_quantity: null,
  expiry_date: null,
  purchase_date: null,
  warranty_date: null,
  status: 'in_stock',
  images: [],
  tags: [],
  metadata: {},
  created_at: '2026-07-26T00:00:00.000Z',
  updated_at: '2026-07-26T00:00:00.000Z',
};

const SECTION_ACTIONS = {
  onOpenContainer: vi.fn(),
  onOpenItem: vi.fn(),
  onOpenContext: vi.fn(),
  onToggleSelection: vi.fn(),
};

describe('HomeInventorySections', () => {
  it('shows a category name once when the category is already the group heading', () => {
    render(
      <HomeInventorySections
        items={[TEST_ITEM]}
        categories={[TEST_CATEGORY]}
        childCounts={{}}
        viewMode="category"
        isSelectionMode={false}
        selectedIds={new Set()}
        {...SECTION_ACTIONS}
      />,
    );

    expect(screen.getAllByText(/数码电子/)).toHaveLength(1);
  });

  it('keeps the category label on cards in the type view', () => {
    render(
      <HomeInventorySections
        items={[TEST_ITEM]}
        categories={[TEST_CATEGORY]}
        childCounts={{}}
        viewMode="type"
        isSelectionMode={false}
        selectedIds={new Set()}
        {...SECTION_ACTIONS}
      />,
    );

    expect(screen.getByText('数码电子')).toBeInTheDocument();
  });
});
