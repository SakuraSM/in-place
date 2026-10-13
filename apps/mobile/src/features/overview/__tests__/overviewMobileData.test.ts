import type { Item } from '@inplace/domain';
import { buildHierarchyItems } from '../overviewMobileData';

jest.mock('@/shared/api/mobileClient', () => ({ itemsApi: {} }));

const items = [
  { id: 'a', parent_id: null, type: 'item', status: 'in_stock', name: '充电线', category: '', description: '', tags: ['旅行'] },
  { id: 'b', parent_id: null, type: 'item', status: 'in_stock', name: '插头', category: '', description: '', tags: ['备用'] },
  { id: 'c', parent_id: 'room', type: 'item', status: 'in_stock', name: '嵌套物品', category: '', description: '', tags: ['旅行'] },
] as Item[];
const filters = { items, parentId: null, query: '', typeFilter: 'all' as const, statusFilter: 'all' as const, selectedTags: [] as string[] };

describe('hierarchy search contract', () => {
  it('matches any selected tag while retaining the direct-child scope', () => {
    expect(buildHierarchyItems({ ...filters, selectedTags: ['旅行', '备用'] }).map((item) => item.id)).toEqual(['a', 'b']);
  });
  it('searches tag text in addition to inventory text', () => {
    expect(buildHierarchyItems({ ...filters, query: '旅行' }).map((item) => item.id)).toEqual(['a']);
  });
});
