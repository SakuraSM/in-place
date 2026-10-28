export interface CategoryValueEntry { category: string; value: number }
export interface CategoryValueBar extends CategoryValueEntry { percentage: number }

/** Normalizes display widths only; labels and amounts retain the report's values. */
export function buildCategoryValueBars(entries: readonly CategoryValueEntry[]): CategoryValueBar[] {
  const maximum = Math.max(0, ...entries.map(entry => Number.isFinite(entry.value) ? entry.value : 0));
  return entries.map(entry => ({ ...entry, percentage: maximum > 0 && Number.isFinite(entry.value) ? Math.max(0, Math.min(100, entry.value / maximum * 100)) : 0 }));
}
