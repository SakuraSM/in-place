import { createInventoryDraft, getInventoryDraftScope, toInventoryItemInput, validateInventoryDraft, type InventoryDraft } from '@inplace/app-core';
import type { Item } from '@inplace/domain';

const draft = (values: Partial<InventoryDraft> = {}): InventoryDraft => ({ ...createInventoryDraft(), name: '测试物品', ...values });

describe('shared inventory draft', () => {
  it('supports zero values, consumables and date-only fields', () => {
    expect(toInventoryItemInput({ userId: 'user', draft: draft({ quantity: '0', price: '0', trackingMode: 'consumable', minimumQuantity: '0', expiryDate: '2028-02-29' }) })).toMatchObject({
      quantity: 0, price: 0, tracking_mode: 'consumable', minimum_quantity: 0, expiry_date: '2028-02-29',
    });
  });
  it.each(['invalid', '-1', 'Infinity', 'NaN'])('rejects invalid price %s before serialization', (price) => {
    expect(validateInventoryDraft(draft({ price })).price).toBeTruthy();
    expect(() => toInventoryItemInput({ userId: 'user', draft: draft({ price }) })).toThrow();
  });
  it.each(['-1', '1.5', '', '9007199254740992'])('rejects invalid quantity %s', (quantity) => {
    expect(validateInventoryDraft(draft({ quantity })).quantity).toBeTruthy();
  });
  it('rejects rolled-over dates and normalizes duplicate tags', () => {
    expect(validateInventoryDraft(draft({ expiryDate: '2026-02-31' })).expiryDate).toBeTruthy();
    expect(toInventoryItemInput({ userId: 'user', draft: draft({ tags: 'A, a，旅行,旅行' }) }).tags).toEqual(['A', '旅行']);
  });
  it('preserves the original item and metadata on edit', () => {
    const item: Item = {
      ...toInventoryItemInput({ userId: 'user', draft: draft({ type: 'container', isLocation: true, quantity: '0', trackingMode: 'quantity', minimumQuantity: '2', expiryDate: '2027-01-01', metadata: { geo_location: { longitude: 120, latitude: 30 }, custom: 'retain' } }) }),
      id: 'item', household_id: 'family', created_at: '', updated_at: '',
    };
    const edited = createInventoryDraft({ item });
    edited.name = '新名称';
    const result = toInventoryItemInput({ draft: edited, userId: 'user' });
    expect(result).toMatchObject({ quantity: 0, tracking_mode: 'quantity', minimum_quantity: 2, expiry_date: '2027-01-01', metadata: item.metadata });
    expect(item.name).toBe('测试物品');
    edited.isLocation = false;
    expect(toInventoryItemInput({ draft: edited, userId: 'user' }).metadata).toEqual({ geo_location: { longitude: 120, latitude: 30 }, custom: 'retain' });
  });
  it('derives category scope from the current draft', () => {
    expect(getInventoryDraftScope(draft())).toBe('item');
    expect(getInventoryDraftScope(draft({ type: 'container' }))).toBe('container');
    expect(getInventoryDraftScope(draft({ type: 'container', isLocation: true }))).toBe('location');
  });
});
