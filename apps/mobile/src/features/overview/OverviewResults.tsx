import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import type { Category, Item } from '@inplace/domain';
import { isLocationItem } from '@/shared/lib/location';
import { buildMobileItemPath } from '@/features/inventory/mobileInventoryFormat';
import { ResultRow, resultListStyle, resultSummaryStyle } from './OverviewMobileUi';

interface OverviewResultsProps {
  items: Item[];
  itemMap: Map<string, Item>;
  categories: Category[];
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelected?: (itemId: string) => void;
}

interface HierarchyResultGroupProps extends OverviewResultsProps { title: string }

const GRID_COLUMNS = 2;

function findResultCategory(item: Item, categories: Category[]): Category | undefined {
  const scope = item.type === 'item' ? 'item' : isLocationItem(item) ? 'location' : 'container';
  return categories.find((category) => category.name === item.category && category.scope === scope);
}

export function FlatResultGrid({ items, itemMap, categories, selectionMode = false, selectedIds = [], onToggleSelected }: OverviewResultsProps): ReactElement {
  const rows = Array.from({ length: Math.ceil(items.length / GRID_COLUMNS) }, (_, index) => items.slice(index * GRID_COLUMNS, (index + 1) * GRID_COLUMNS));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((item) => (
            <View key={item.id} style={{ flex: 1, minWidth: 0 }}>
              <ResultRow
                presentation="card"
                item={item}
                category={findResultCategory(item, categories)}
                path={buildMobileItemPath(item, itemMap)}
                selectionMode={selectionMode}
                selected={selectedIds.includes(item.id)}
                onToggleSelected={onToggleSelected}
              />
            </View>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function HierarchyResultGroup({
  title,
  items,
  itemMap,
  categories,
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
          category={findResultCategory(item, categories)}
          path={buildMobileItemPath(item, itemMap)}
          selectionMode={selectionMode}
          selected={selectedIds.includes(item.id)}
          onToggleSelected={onToggleSelected}
        />
      ))}
    </View>
  );
}
