import { describe, expect, it } from 'vitest';
import { importEntriesSchema, planImportEntries } from './mcp-import.schema.js';

function parse(items: unknown[]) {
  return importEntriesSchema.parse({ requestKey: 'test-batch-001', items });
}

describe('MCP import planning', () => {
  it('defaults to a preview and orders mixed locations, containers and items by parent', () => {
    const input = parse([
      { key: 'book', name: '书', parentKey: 'shelf' },
      { key: 'shelf', name: '书架', kind: 'container', parentKey: 'room' },
      { key: 'room', name: '书房', kind: 'location' },
    ]);
    expect(input.dryRun).toBe(true);
    expect(planImportEntries(input.items).map(entry => entry.key)).toEqual(['room', 'shelf', 'book']);
  });
  it.each([
    [{ key: 'same', name: '一' }, { key: 'same', name: '二' }],
    [{ key: 'child', name: '物品', parentKey: 'missing' }],
    [{ key: 'parent', name: '物品' }, { key: 'child', name: '下级', parentKey: 'parent' }],
    [{ key: 'a', name: '循环', kind: 'container', parentKey: 'b' }, { key: 'b', name: '循环', kind: 'container', parentKey: 'a' }],
    [{ key: 'a', name: '双父级', parentKey: 'b', parentId: '00000000-0000-4000-8000-000000000001' }],
  ])('rejects ambiguous or invalid hierarchy %#', (...entries) => {
    expect(() => planImportEntries(parse(entries).items)).toThrow();
  });
  it('rejects tenant overrides, invalid dates and oversized batches', () => {
    expect(() => parse([{ key: 'x', name: '物品', householdId: 'foreign' }])).toThrow();
    expect(() => parse([{ key: 'x', name: '物品', expiryDate: '2026-02-30' }])).toThrow();
    expect(() => parse(Array.from({ length: 101 }, (_, index) => ({ key: String(index), name: '物品' })))).toThrow();
  });
});
