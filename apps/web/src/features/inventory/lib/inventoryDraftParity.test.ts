import { describe, expect, it } from 'vitest';
import { createInventoryDraft, toInventoryItemInput } from '@inplace/app-core';
import { createInitialItemFormData, toItemCreateInput } from '../components/itemFormData';

describe('Web/native inventory payload parity', () => {
  it.each(['item', 'container', 'location'] as const)('keeps the %s payload contract', (kind) => {
    const type = kind === 'item' ? 'item' : 'container';
    const web = createInitialItemFormData({ defaultType: type, fixedLocation: kind === 'location' });
    const native = createInventoryDraft({ type });
    Object.assign(web, { name: 'Test', isLocation: kind === 'location', quantity: 0, tracking_mode: 'consumable', minimum_quantity: '0', expiry_date: '2027-01-01', price: '0', tags: ['旅行'], metadata: { custom: true } });
    Object.assign(native, { name: 'Test', isLocation: kind === 'location', quantity: '0', trackingMode: 'consumable', minimumQuantity: '0', expiryDate: '2027-01-01', price: '0', tags: '旅行', metadata: { custom: true } });
    expect(toInventoryItemInput({ draft: native, userId: 'user' })).toEqual(toItemCreateInput(web, 'user'));
  });
});
