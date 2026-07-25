export function toggleSelectionId(selectedIds: string[], itemId: string) {
  return selectedIds.includes(itemId)
    ? selectedIds.filter((id) => id !== itemId)
    : [...selectedIds, itemId];
}

export function toggleSelectAllIds(
  selectedIds: string[],
  availableIds: string[],
) {
  const allSelected = availableIds.length > 0
    && availableIds.every((id) => selectedIds.includes(id));
  return allSelected ? [] : [...availableIds];
}
