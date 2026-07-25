import { useMemo } from 'react';
import { Box } from 'lucide-react';
import { INVENTORY_NODE_LABELS } from '@inplace/app-core';
import type { Category, Item } from '../../../legacy/database.types';
import { CategoryIcon, getColorClasses } from '../lib/categoryPresentation';
import ContainerCard from './ContainerCard';
import ItemCard from './ItemCard';

export type HomeViewMode = 'type' | 'category';

interface HomeInventorySectionsProps {
  items: Item[];
  categories: Category[];
  childCounts: Record<string, number>;
  viewMode: HomeViewMode;
  isSelectionMode: boolean;
  selectedIds: ReadonlySet<string>;
  onOpenContainer: (item: Item) => void;
  onOpenItem: (item: Item) => void;
  onOpenContext: (item: Item) => void;
  onToggleSelection: (itemId: string) => void;
}

interface InventoryGridProps {
  items: Item[];
  categories: Category[];
  childCounts: Record<string, number>;
  isSelectionMode: boolean;
  selectedIds: ReadonlySet<string>;
  onOpenContainer: (item: Item) => void;
  onOpenItem: (item: Item) => void;
  onOpenContext: (item: Item) => void;
  onToggleSelection: (itemId: string) => void;
}

function InventoryGrid({
  items,
  categories,
  childCounts,
  isSelectionMode,
  selectedIds,
  onOpenContainer,
  onOpenItem,
  onOpenContext,
  onToggleSelection,
}: InventoryGridProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
    >
      {items.map((item) => {
        const category = categories.find(
          (candidate) => candidate.name === item.category && candidate.item_type === item.type,
        );
        const isSelected = selectedIds.has(item.id);

        if (item.type === 'container') {
          return (
            <ContainerCard
              key={item.id}
              item={item}
              childCount={childCounts[item.id]}
              category={category}
              onClick={() => onOpenContainer(item)}
              onLongPress={() => onOpenContext(item)}
              selectionMode={isSelectionMode}
              selected={isSelected}
              onSelect={() => onToggleSelection(item.id)}
            />
          );
        }

        return (
          <ItemCard
            key={item.id}
            item={item}
            category={category}
            onClick={() => onOpenItem(item)}
            onLongPress={() => onOpenContext(item)}
            selectionMode={isSelectionMode}
            selected={isSelected}
            onSelect={() => onToggleSelection(item.id)}
          />
        );
      })}
    </div>
  );
}

export default function HomeInventorySections({
  items,
  categories,
  childCounts,
  viewMode,
  isSelectionMode,
  selectedIds,
  onOpenContainer,
  onOpenItem,
  onOpenContext,
  onToggleSelection,
}: HomeInventorySectionsProps) {
  const groupedItems = useMemo(() => {
    if (viewMode === 'type') {
      return [
        {
          key: 'containers',
          label: INVENTORY_NODE_LABELS.mixedContainer,
          icon: null,
          items: items.filter((item) => item.type === 'container'),
          categories,
        },
        {
          key: 'items',
          label: INVENTORY_NODE_LABELS.item,
          icon: null,
          items: items.filter((item) => item.type === 'item'),
          categories,
        },
      ].filter((group) => group.items.length > 0);
    }

    const categoryGroups = categories.map((category) => ({
      key: category.id,
      label: category.name,
      icon: category,
      items: items.filter(
        (item) => item.type === category.item_type && item.category === category.name,
      ),
      categories: [category],
    }));
    const uncategorizedGroups = (['container', 'item'] as const).map((itemType) => {
      const typeCategories = categories.filter((category) => category.item_type === itemType);
      return {
        key: `uncategorized-${itemType}`,
        label: itemType === 'container'
          ? `其他${INVENTORY_NODE_LABELS.mixedContainer}`
          : '其他物品',
        icon: null,
        items: items.filter(
          (item) => item.type === itemType
            && !typeCategories.some((category) => category.name === item.category),
        ),
        categories: typeCategories,
      };
    });

    return [...categoryGroups, ...uncategorizedGroups].filter((group) => group.items.length > 0);
  }, [categories, items, viewMode]);

  return (
    <div
      key={viewMode}
        className="flex min-h-full flex-1 flex-col space-y-7"
      >
        {groupedItems.map((group) => {
          const colorClasses = group.icon ? getColorClasses(group.icon.color) : null;
          return (
            <section key={group.key} aria-labelledby={`inventory-group-${group.key}`}>
              <div className="mb-3 flex items-center gap-2">
                {group.icon && colorClasses ? (
                  <span className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg ${colorClasses.bg}`}>
                    <CategoryIcon
                      icon={group.icon.icon}
                      fallback={Box}
                      size={13}
                      className={colorClasses.text}
                      imageClassName="h-full w-full object-cover"
                    />
                  </span>
                ) : null}
                <h2
                  id={`inventory-group-${group.key}`}
                  className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
                >
                  {group.label} ({group.items.length})
                </h2>
              </div>
              <InventoryGrid
                items={group.items}
                categories={categories}
                childCounts={childCounts}
                isSelectionMode={isSelectionMode}
                selectedIds={selectedIds}
                onOpenContainer={onOpenContainer}
                onOpenItem={onOpenItem}
                onOpenContext={onOpenContext}
                onToggleSelection={onToggleSelection}
              />
            </section>
          );
        })}
    </div>
  );
}
