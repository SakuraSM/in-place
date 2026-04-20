import type { Item } from '../../../legacy/database.types';
import { isLocationItem } from './locationTag';

export interface LocationTreeNode {
  item: Item;
  children: LocationTreeNode[];
}

export interface LocationContentStats {
  locations: number;
  containers: number;
  items: number;
  total: number;
}

export function buildItemMap(items: Item[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export function buildChildrenMap(items: Item[]) {
  const childrenMap = new Map<string | null, Item[]>();

  for (const item of items) {
    const bucket = childrenMap.get(item.parent_id) ?? [];
    bucket.push(item);
    childrenMap.set(item.parent_id, bucket);
  }

  for (const bucket of childrenMap.values()) {
    bucket.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  }

  return childrenMap;
}

export function buildLocationTree(items: Item[]) {
  const itemMap = buildItemMap(items);
  const locationItems = items
    .filter(isLocationItem)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  const nodeMap = new Map<string, LocationTreeNode>(
    locationItems.map((item) => [item.id, { item, children: [] }]),
  );

  const roots: LocationTreeNode[] = [];

  for (const item of locationItems) {
    const node = nodeMap.get(item.id);
    if (!node) {
      continue;
    }

    let parentId = item.parent_id;
    let parentLocationNode: LocationTreeNode | undefined;

    while (parentId) {
      const parentItem = itemMap.get(parentId);
      if (!parentItem) {
        break;
      }

      if (isLocationItem(parentItem)) {
        parentLocationNode = nodeMap.get(parentItem.id);
        break;
      }

      parentId = parentItem.parent_id;
    }

    if (parentLocationNode) {
      parentLocationNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: LocationTreeNode[]) => {
    nodes.sort((left, right) => left.item.name.localeCompare(right.item.name, 'zh-CN'));
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);
  return roots;
}

export function collectDescendantIds(items: Item[], rootId: string) {
  const childrenMap = buildChildrenMap(items);
  const collected = new Set<string>();
  const stack = [...(childrenMap.get(rootId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || collected.has(current.id)) {
      continue;
    }

    collected.add(current.id);
    const children = childrenMap.get(current.id);
    if (children) {
      stack.push(...children);
    }
  }

  return collected;
}

export function buildItemLineage(itemId: string, itemMap: Map<string, Item>) {
  const lineage: Item[] = [];
  const visited = new Set<string>();
  let currentId: string | null = itemId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = itemMap.get(currentId);
    if (!item) {
      break;
    }

    lineage.unshift(item);
    currentId = item.parent_id;
  }

  return lineage;
}

export function buildItemPath(item: Item, itemMap: Map<string, Item>) {
  return buildItemLineage(item.id, itemMap)
    .slice(0, -1)
    .map((ancestor) => ancestor.name)
    .join(' > ');
}

export function countLocationContents(items: Item[], locationId: string): LocationContentStats {
  const descendantIds = collectDescendantIds(items, locationId);
  const stats: LocationContentStats = {
    locations: 0,
    containers: 0,
    items: 0,
    total: descendantIds.size,
  };

  const itemMap = buildItemMap(items);
  for (const descendantId of descendantIds) {
    const item = itemMap.get(descendantId);
    if (!item) {
      continue;
    }

    if (item.type === 'item') {
      stats.items += 1;
      continue;
    }

    if (isLocationItem(item)) {
      stats.locations += 1;
      continue;
    }

    stats.containers += 1;
  }

  return stats;
}
