import type { Item } from '@inplace/domain';
import { isLocationItem } from './locationTag';

export type AssetMapNodeKind = 'location' | 'container' | 'item';

export interface AssetMapMetrics {
  directChildCount: number;
  descendantNodeCount: number;
  assetCount: number;
  totalQuantity: number;
  estimatedValue: number;
}

export interface AssetMapNode {
  id: string;
  parentId: string | null;
  item: Item;
  kind: AssetMapNodeKind;
  path: string[];
  metrics: AssetMapMetrics;
  searchableText: string;
}

export interface AssetMapTotals {
  locations: number;
  containers: number;
  items: number;
  totalQuantity: number;
  estimatedValue: number;
}

export interface AssetMapProjection {
  nodesById: Map<string, AssetMapNode>;
  childrenByParentId: Map<string | null, AssetMapNode[]>;
  rootNodes: AssetMapNode[];
  categories: string[];
  totals: AssetMapTotals;
}

interface AggregateMetrics {
  nodeCount: number;
  assetCount: number;
  totalQuantity: number;
  estimatedValue: number;
}

interface AggregateCalculationContext {
  nodesById: Map<string, AssetMapNode>;
  childrenByParentId: Map<string | null, AssetMapNode[]>;
  aggregateCache: Map<string, AggregateMetrics>;
  activeNodeIds: Set<string>;
}

const EMPTY_AGGREGATE_METRICS: AggregateMetrics = {
  nodeCount: 0,
  assetCount: 0,
  totalQuantity: 0,
  estimatedValue: 0,
};

function resolveNodeKind(item: Item): AssetMapNodeKind {
  if (item.type === 'item') {
    return 'item';
  }

  return isLocationItem(item) ? 'location' : 'container';
}

function resolveItemEstimatedValue(item: Item): number {
  if (item.type !== 'item' || item.price === null) {
    return 0;
  }

  return item.price * Math.max(item.quantity, 0);
}

function buildItemPath(item: Item, itemsById: Map<string, Item>): string[] {
  const path: string[] = [];
  const visitedItemIds = new Set<string>([item.id]);
  let parentId = item.parent_id;

  while (parentId && !visitedItemIds.has(parentId)) {
    visitedItemIds.add(parentId);
    const parent = itemsById.get(parentId);
    if (!parent) {
      break;
    }

    path.unshift(parent.name);
    parentId = parent.parent_id;
  }

  return path;
}

function buildSearchableText(item: Item, path: string[]): string {
  return [
    item.name,
    item.category,
    ...item.tags,
    ...path,
  ].join(' ').toLocaleLowerCase('zh-CN');
}

function sortAssetMapNodes(nodes: AssetMapNode[]): void {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) {
      const kindOrder: Record<AssetMapNodeKind, number> = {
        location: 0,
        container: 1,
        item: 2,
      };
      return kindOrder[left.kind] - kindOrder[right.kind];
    }

    return left.item.name.localeCompare(right.item.name, 'zh-CN');
  });
}

function calculateAggregateMetrics(
  nodeId: string,
  context: AggregateCalculationContext,
): AggregateMetrics {
  const {
    nodesById,
    childrenByParentId,
    aggregateCache,
    activeNodeIds,
  } = context;
  const cachedMetrics = aggregateCache.get(nodeId);
  if (cachedMetrics) {
    return cachedMetrics;
  }

  const node = nodesById.get(nodeId);
  if (!node || activeNodeIds.has(nodeId)) {
    return EMPTY_AGGREGATE_METRICS;
  }

  activeNodeIds.add(nodeId);
  const isAsset = node.kind === 'item';
  const aggregateMetrics: AggregateMetrics = {
    nodeCount: 1,
    assetCount: isAsset ? 1 : 0,
    totalQuantity: isAsset ? Math.max(node.item.quantity, 0) : 0,
    estimatedValue: resolveItemEstimatedValue(node.item),
  };

  for (const child of childrenByParentId.get(nodeId) ?? []) {
    const childMetrics = calculateAggregateMetrics(child.id, context);
    aggregateMetrics.nodeCount += childMetrics.nodeCount;
    aggregateMetrics.assetCount += childMetrics.assetCount;
    aggregateMetrics.totalQuantity += childMetrics.totalQuantity;
    aggregateMetrics.estimatedValue += childMetrics.estimatedValue;
  }

  activeNodeIds.delete(nodeId);
  aggregateCache.set(nodeId, aggregateMetrics);
  return aggregateMetrics;
}

export function buildAssetMapProjection(items: Item[]): AssetMapProjection {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const nodesById = new Map<string, AssetMapNode>();
  const childrenByParentId = new Map<string | null, AssetMapNode[]>();
  const categoryNames = new Set<string>();
  const totals: AssetMapTotals = {
    locations: 0,
    containers: 0,
    items: 0,
    totalQuantity: 0,
    estimatedValue: 0,
  };

  for (const item of items) {
    const kind = resolveNodeKind(item);
    const path = buildItemPath(item, itemsById);
    const parentId = item.parent_id && itemsById.has(item.parent_id) && item.parent_id !== item.id
      ? item.parent_id
      : null;
    const node: AssetMapNode = {
      id: item.id,
      parentId,
      item,
      kind,
      path,
      metrics: {
        directChildCount: 0,
        descendantNodeCount: 0,
        assetCount: kind === 'item' ? 1 : 0,
        totalQuantity: kind === 'item' ? Math.max(item.quantity, 0) : 0,
        estimatedValue: resolveItemEstimatedValue(item),
      },
      searchableText: buildSearchableText(item, path),
    };

    nodesById.set(node.id, node);
    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(node);
    childrenByParentId.set(parentId, siblings);

    if (item.category.trim()) {
      categoryNames.add(item.category.trim());
    }

    if (kind === 'location') {
      totals.locations += 1;
    } else if (kind === 'container') {
      totals.containers += 1;
    } else {
      totals.items += 1;
      totals.totalQuantity += Math.max(item.quantity, 0);
      totals.estimatedValue += resolveItemEstimatedValue(item);
    }
  }

  for (const siblings of childrenByParentId.values()) {
    sortAssetMapNodes(siblings);
  }

  const aggregateCache = new Map<string, AggregateMetrics>();
  for (const node of nodesById.values()) {
    const aggregateMetrics = calculateAggregateMetrics(
      node.id,
      {
        nodesById,
        childrenByParentId,
        aggregateCache,
        activeNodeIds: new Set<string>(),
      },
    );
    node.metrics = {
      directChildCount: childrenByParentId.get(node.id)?.length ?? 0,
      descendantNodeCount: Math.max(aggregateMetrics.nodeCount - 1, 0),
      assetCount: aggregateMetrics.assetCount,
      totalQuantity: aggregateMetrics.totalQuantity,
      estimatedValue: aggregateMetrics.estimatedValue,
    };
  }

  return {
    nodesById,
    childrenByParentId,
    rootNodes: childrenByParentId.get(null) ?? [],
    categories: [...categoryNames].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    totals,
  };
}
