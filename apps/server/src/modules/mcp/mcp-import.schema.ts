import * as z from 'zod-mcp';

export const MAX_IMPORT_ITEMS = 100;
export const importEntrySchema = z.object({
  key: z.string().trim().min(1).max(80).describe('本批次唯一键，供其他记录的 parentKey 引用'),
  kind: z.enum(['item', 'container', 'location']).default('item'),
  name: z.string().trim().min(1).max(160),
  parentKey: z.string().trim().min(1).max(80).optional().describe('本批次父级 key，不能与 parentId 同时填写'),
  parentId: z.string().uuid().optional().describe('当前家庭已有位置或收纳的 ID'),
  description: z.string().max(10000).default(''),
  category: z.string().trim().max(120).default(''),
  quantity: z.number().int().min(0).max(2_147_483_647).default(1),
  price: z.number().min(0).max(9_999_999_999.99).nullable().default(null),
  status: z.enum(['in_stock', 'borrowed', 'worn_out']).default('in_stock'),
  trackingMode: z.enum(['unique', 'quantity', 'consumable']).default('unique'),
  minimumQuantity: z.number().int().min(0).max(2_147_483_647).nullable().default(null),
  expiryDate: z.string().date().nullable().default(null),
  purchaseDate: z.string().date().nullable().default(null),
  warrantyDate: z.string().date().nullable().default(null),
  images: z.array(z.string().url()).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const importEntriesSchema = z.object({
  requestKey: z.string().trim().min(8).max(100).describe('批次请求编号；重试必须复用，内容改变必须换新编号'),
  dryRun: z.boolean().default(true).describe('默认仅预览；确认预览内容后设为 false 才会写入'),
  items: z.array(importEntrySchema).min(1).max(MAX_IMPORT_ITEMS),
}).strict();

export type ImportEntry = z.infer<typeof importEntrySchema>;
export type ImportEntriesInput = z.infer<typeof importEntriesSchema>;

export class McpInputError extends Error {}

/** Parents precede their children regardless of the input order. */
export function planImportEntries(entries: ImportEntry[]): ImportEntry[] {
  const entryMap = new Map<string, ImportEntry>();
  for (const entry of entries) {
    if (entryMap.has(entry.key)) throw new McpInputError(`批次 key 重复：${entry.key}`);
    if (entry.parentKey && entry.parentId) throw new McpInputError('parentKey 与 parentId 不能同时填写');
    entryMap.set(entry.key, entry);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: ImportEntry[] = [];
  function visit(entry: ImportEntry): void {
    if (visited.has(entry.key)) return;
    if (visiting.has(entry.key)) throw new McpInputError('父级关系存在循环');
    visiting.add(entry.key);
    if (entry.parentKey) {
      const parent = entryMap.get(entry.parentKey);
      if (!parent || parent.kind === 'item') throw new McpInputError(`父级不存在或不是位置/收纳：${entry.parentKey}`);
      visit(parent);
    }
    visiting.delete(entry.key);
    visited.add(entry.key);
    ordered.push(entry);
  }
  entries.forEach(visit);
  return ordered;
}
