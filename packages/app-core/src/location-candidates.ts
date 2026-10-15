import type { Item } from '@inplace/domain';

export function buildLocationCandidates(items: Item[], excludedIds: readonly string[] = []) {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const excluded = new Set(excludedIds);
  return items.filter((item) => item.type === 'container').flatMap((item) => {
    const names: string[] = [];
    const visited = new Set<string>();
    let current: Item | undefined = item;
    while (current) {
      if (excluded.has(current.id) || visited.has(current.id)) return [];
      visited.add(current.id);
      names.unshift(current.name);
      current = current.parent_id ? itemMap.get(current.parent_id) : undefined;
    }
    return [{ item, path: names.join(' > ') }];
  });
}

export function filterLocationCandidates(candidates: ReturnType<typeof buildLocationCandidates>, query: string) {
  const terms = query.trim().toLocaleLowerCase('zh-CN').split(/\s+/);
  return candidates.filter(({ path }) => terms.every((term) => path.toLocaleLowerCase('zh-CN').includes(term)));
}
