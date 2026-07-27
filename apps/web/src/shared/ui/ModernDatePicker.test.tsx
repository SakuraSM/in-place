import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mapServerItem, type ServerItem } from '@inplace/app-core';
import ModernDatePicker from './ModernDatePicker';

const serverItem: ServerItem = {
  id: 'item-1',
  userId: 'user-1',
  householdId: 'household-1',
  parentId: null,
  type: 'item',
  name: '日期测试物品',
  description: '',
  category: '',
  price: null,
  quantity: 1,
  trackingMode: 'unique',
  minimumQuantity: null,
  expiryDate: '2026-08-01',
  purchaseDate: '2026-07-28T00:00:00.000Z',
  warrantyDate: '2027-07-28T00:00:00.000Z',
  status: 'in_stock',
  images: [],
  tags: [],
  metadata: {},
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:00.000Z',
};

describe('item date normalization', () => {
  it('maps API timestamps to the date-only values used by edit forms', () => {
    const item = mapServerItem(serverItem);

    expect(item.expiry_date).toBe('2026-08-01');
    expect(item.purchase_date).toBe('2026-07-28');
    expect(item.warranty_date).toBe('2027-07-28');
  });

  it('defensively displays an ISO timestamp when passed directly', () => {
    render(
      <ModernDatePicker
        value="2026-07-28T00:00:00.000Z"
        onChange={vi.fn()}
        placeholder="选择购买日期"
      />,
    );

    expect(screen.getByRole('button', { name: '2026年7月28日' })).toBeInTheDocument();
  });

  it('opens above a low trigger so the calendar remains selectable', async () => {
    const user = userEvent.setup();
    render(
      <ModernDatePicker
        value=""
        onChange={vi.fn()}
        placeholder="选择保修截止日期"
      />,
    );

    const trigger = screen.getByRole('button', { name: '选择保修截止日期' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 700,
      right: 600,
      bottom: 744,
      left: 280,
      width: 320,
      height: 44,
      x: 280,
      y: 700,
      toJSON: () => ({}),
    });

    await user.click(trigger);
    const panel = screen.getByRole('dialog', { name: '日期选择器' });
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      right: 600,
      bottom: 380,
      left: 280,
      width: 320,
      height: 380,
      x: 280,
      y: 0,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    fireEvent(window, new Event('resize'));

    expect(Number.parseFloat(panel.style.top)).toBeLessThan(700);
    expect(panel).toHaveClass('overflow-y-auto');
  });
});
