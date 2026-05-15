import { Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { buildMobileItemPath } from '@/features/inventory/mobileInventoryFormat';
import { ResultRow, resultListStyle, resultSummaryStyle } from './OverviewMobileUi';

interface HierarchyResultGroupProps {
  title: string;
  items: Item[];
  itemMap: Map<string, Item>;
}

export function HierarchyResultGroup({ title, items, itemMap }: HierarchyResultGroupProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={resultListStyle}>
      <Text style={resultSummaryStyle}>{title}</Text>
      {items.map((item) => (
        <ResultRow key={item.id} item={item} path={buildMobileItemPath(item, itemMap)} />
      ))}
    </View>
  );
}
