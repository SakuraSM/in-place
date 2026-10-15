import { buildLocationCandidates, filterLocationCandidates, inventoryDateToIso, parseInventoryQuantity } from '@inplace/app-core';
import type { Item } from '@inplace/domain';
import { normalizeServerUrl } from '@/shared/api/mobileApiUrl';

const locations = [
  { id: 'living', name: '客厅', parent_id: null, type: 'container' },
  { id: 'cabinet', name: '柜子', parent_id: 'living', type: 'container' },
  { id: 'box', name: '盒子', parent_id: 'cabinet', type: 'container' },
  { id: 'bedroom', name: '卧室', parent_id: null, type: 'container' },
  { id: 'other', name: '盒子', parent_id: 'bedroom', type: 'container' },
  { id: 'object', name: '物品', parent_id: 'box', type: 'item' },
] as Item[];

it('finds deep locations by path and excludes the entire subtree while moving', () => {
  expect(filterLocationCandidates(buildLocationCandidates(locations), '客厅 盒子').map(({ path }) => path)).toEqual(['客厅 > 柜子 > 盒子']);
  expect(filterLocationCandidates(buildLocationCandidates(locations, ['cabinet']), '盒子').map(({ item }) => item.id)).toEqual(['other']);
  expect(buildLocationCandidates(locations, ['living', 'bedroom'])).toEqual([]);
});

it('preserves the selected local calendar day when producing the datetime API payload', () => {
  const result = new Date(inventoryDateToIso('2028-02-29')!);
  expect([result.getFullYear(), result.getMonth() + 1, result.getDate(), result.getHours()]).toEqual([2028, 2, 29, 12]);
  expect(inventoryDateToIso('')).toBeNull();
  expect(() => inventoryDateToIso('2026-02-29')).toThrow('有效日期');
});

it.each(['-1', '1.5', '', 'NaN', '9007199254740992'])('rejects an invalid stock count %s', (value) => {
  expect(() => parseInventoryQuantity(value)).toThrow('非负整数');
});

it('accepts zero stock and a large replenishment', () => {
  expect(parseInventoryQuantity('0')).toBe(0);
  expect(parseInventoryQuantity('200')).toBe(200);
});

it('accepts a bare domain while preserving production HTTPS and path constraints', () => {
  expect(normalizeServerUrl(' home.example.com/ ')).toBe('https://home.example.com/api');
  expect(normalizeServerUrl('https://home.example.com/inplace/api/')).toBe('https://home.example.com/inplace/api');
  expect(() => normalizeServerUrl('http://home.example.com')).toThrow('HTTPS');
  expect(() => normalizeServerUrl('')).toThrow('请输入');
  expect(() => normalizeServerUrl('not a host')).toThrow();
  expect(() => normalizeServerUrl('https://user:pass@home.example.com')).toThrow();
  expect(normalizeServerUrl('http://10.0.2.2:4001', true)).toBe('http://10.0.2.2:4001/api');
});
