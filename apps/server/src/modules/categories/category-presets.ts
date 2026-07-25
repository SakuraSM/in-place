export type CategoryScope = 'location' | 'container' | 'item';

export interface CategoryPreset {
  key: string;
  scope: CategoryScope;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORY_PRESETS: readonly CategoryPreset[] = [
  { key: 'location.apartment', scope: 'location', name: '公寓', icon: 'Building2', color: 'sky' },
  { key: 'location.room', scope: 'location', name: '房间', icon: 'DoorOpen', color: 'sky' },
  { key: 'location.floor', scope: 'location', name: '楼层', icon: 'Layers', color: 'sky' },
  { key: 'location.outdoor', scope: 'location', name: '户外区域', icon: 'TentTree', color: 'emerald' },
  { key: 'location.garage', scope: 'location', name: '车库', icon: 'Car', color: 'slate' },
  { key: 'container.cabinet', scope: 'container', name: '柜子', icon: 'Archive', color: 'teal' },
  { key: 'container.drawer', scope: 'container', name: '抽屉', icon: 'Layers', color: 'teal' },
  { key: 'container.box', scope: 'container', name: '收纳箱', icon: 'Box', color: 'teal' },
  { key: 'container.shelf', scope: 'container', name: '置物架', icon: 'Grid2x2', color: 'teal' },
  { key: 'container.fridge', scope: 'container', name: '冰箱', icon: 'Refrigerator', color: 'sky' },
  { key: 'container.bag', scope: 'container', name: '包袋', icon: 'ShoppingBag', color: 'rose' },
  { key: 'item.digital', scope: 'item', name: '数码电子', icon: 'MonitorSmartphone', color: 'sky' },
  { key: 'item.clothing', scope: 'item', name: '服饰鞋包', icon: 'Shirt', color: 'rose' },
  { key: 'item.books', scope: 'item', name: '书籍文具', icon: 'BookOpen', color: 'amber' },
  { key: 'item.kitchen', scope: 'item', name: '餐厨用品', icon: 'Utensils', color: 'orange' },
  { key: 'item.appliances', scope: 'item', name: '家用电器', icon: 'Tv', color: 'violet' },
  { key: 'item.tools', scope: 'item', name: '工具五金', icon: 'Wrench', color: 'slate' },
  { key: 'item.cleaning', scope: 'item', name: '清洁护理', icon: 'Sparkles', color: 'teal' },
  { key: 'item.health', scope: 'item', name: '药品健康', icon: 'Pill', color: 'emerald' },
  { key: 'item.toys', scope: 'item', name: '玩具模型', icon: 'ToyBrick', color: 'amber' },
  { key: 'item.valuables', scope: 'item', name: '证件纪念', icon: 'Gift', color: 'rose' },
] as const;

export function itemTypeForCategoryScope(scope: CategoryScope) {
  return scope === 'item' ? 'item' as const : 'container' as const;
}

export function categoryIdentity(scope: CategoryScope, name: string) {
  return `${scope}:${name.trim().toLocaleLowerCase('zh-CN')}`;
}
