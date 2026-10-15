import { isInventoryDate } from './inventory-draft';

/** Calendar inputs represent a local day, independent of the UTC offset. */
export function inventoryDateToIso(value: string): string | null {
  if (!value) return null;
  if (!isInventoryDate(value)) throw new Error('请输入有效日期，格式为 YYYY-MM-DD');
  return new Date(`${value}T12:00:00`).toISOString();
}

export function parseInventoryQuantity(value: string): number {
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value))) {
    throw new Error('数量必须是非负整数');
  }
  return Number(value);
}
