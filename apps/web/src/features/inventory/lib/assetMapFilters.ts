import type { ItemStatus } from '@inplace/domain';
import {
  type AssetMapNode,
  type AssetMapNodeKind,
  type AssetMapProjection,
} from './assetMap';

export const ASSET_MAP_ALL_FILTER = 'all';

export type AssetMapTypeFilter = typeof ASSET_MAP_ALL_FILTER | AssetMapNodeKind;
export type AssetMapStatusFilter = typeof ASSET_MAP_ALL_FILTER | ItemStatus;

export interface AssetMapFilters {
  query: string;
  type: AssetMapTypeFilter;
  status: AssetMapStatusFilter;
  category: string;
}

export interface FilteredAssetMap {
  matchedNodeIds: Set<string>;
  visibleNodeIds: Set<string>;
  visibleChildren: AssetMapNode[];
}

interface FilterAssetMapInput {
  projection: AssetMapProjection;
  filters: AssetMapFilters;
  scopeId: string | null;
}

interface FindAssetMapMatchesInput {
  projection: AssetMapProjection;
  filters: AssetMapFilters;
  limit?: number;
}

const DEFAULT_SEARCH_RESULT_LIMIT = 8;

function doesNodeMatchFilters(node: AssetMapNode, filters: AssetMapFilters): boolean {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('zh-CN');
  if (normalizedQuery && !node.searchableText.includes(normalizedQuery)) {
    return false;
  }

  if (filters.type !== ASSET_MAP_ALL_FILTER && node.kind !== filters.type) {
    return false;
  }

  if (filters.status !== ASSET_MAP_ALL_FILTER && node.item.status !== filters.status) {
    return false;
  }

  return filters.category === ASSET_MAP_ALL_FILTER || node.item.category === filters.category;
}

function collectVisibleAncestors(input: {
  node: AssetMapNode;
  projection: AssetMapProjection;
  visibleNodeIds: Set<string>;
}): void {
  const { node, projection, visibleNodeIds } = input;
  const visitedNodeIds = new Set<string>();
  let currentNode: AssetMapNode | undefined = node;

  while (currentNode && !visitedNodeIds.has(currentNode.id)) {
    visitedNodeIds.add(currentNode.id);
    visibleNodeIds.add(currentNode.id);
    currentNode = currentNode.parentId
      ? projection.nodesById.get(currentNode.parentId)
      : undefined;
  }
}

export function filterAssetMapProjection(
  input: FilterAssetMapInput,
): FilteredAssetMap {
  const { projection, filters, scopeId } = input;
  const matchedNodeIds = new Set<string>();
  const visibleNodeIds = new Set<string>();

  for (const node of projection.nodesById.values()) {
    if (!doesNodeMatchFilters(node, filters)) {
      continue;
    }

    matchedNodeIds.add(node.id);
    collectVisibleAncestors({ node, projection, visibleNodeIds });
  }

  const scopeChildren = scopeId
    ? projection.childrenByParentId.get(scopeId) ?? []
    : projection.rootNodes;

  return {
    matchedNodeIds,
    visibleNodeIds,
    visibleChildren: scopeChildren.filter((node) => visibleNodeIds.has(node.id)),
  };
}

export function findAssetMapMatches(
  input: FindAssetMapMatchesInput,
): AssetMapNode[] {
  const {
    projection,
    filters,
    limit = DEFAULT_SEARCH_RESULT_LIMIT,
  } = input;
  if (!filters.query.trim()) {
    return [];
  }

  const matches: AssetMapNode[] = [];
  for (const node of projection.nodesById.values()) {
    if (!doesNodeMatchFilters(node, filters)) {
      continue;
    }

    matches.push(node);
    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}
