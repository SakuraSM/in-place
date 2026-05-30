import { Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { buildMobileItemPath } from '@/features/inventory/mobileInventoryFormat';
import { ResultRow, resultListStyle, resultSummaryStyle } from './OverviewMobileUi';

interface HierarchyResultGroupProps {
  title: string;
  items: Item[];
  itemMap: Map<string, Item>;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelected?: (itemId: string) => void;
}

export function HierarchyResultGroup({
  title,
  items,
  itemMap,
  selectionMode = false,
  selectedIds = [],
  onToggleSelected,
}: HierarchyResultGroupProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={resultListStyle}>
      <Text style={resultSummaryStyle}>{title}</Text>
      {items.map((item) => (
        <ResultRow
          key={item.id}
          item={item}
          path={buildMobileItemPath(item, itemMap)}
          selectionMode={selectionMode}
          selected={selectedIds.includes(item.id)}
          onToggleSelected={onToggleSelected}
        />
      ))}
    </View>
  );
}
