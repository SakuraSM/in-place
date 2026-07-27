export const CATEGORY_PRESET_ARTWORK = {
  'location.apartment': {
    assetStem: 'location-apartment',
    legacyIcon: 'Building2',
    description: '柔和蓝色的现代公寓楼',
  },
  'location.room': {
    assetStem: 'location-room',
    legacyIcon: 'DoorOpen',
    description: '带床和灯的舒适房间',
  },
  'location.floor': {
    assetStem: 'location-floor',
    legacyIcon: 'Layers',
    description: '三层叠放的建筑楼层',
  },
  'location.outdoor': {
    assetStem: 'location-outdoor',
    legacyIcon: 'TentTree',
    description: '包含树、长椅和小径的户外区域',
  },
  'location.garage': {
    assetStem: 'location-garage',
    legacyIcon: 'Car',
    description: '停放小汽车的现代车库',
  },
  'container.cabinet': {
    assetStem: 'container-cabinet',
    legacyIcon: 'Archive',
    description: '一扇门打开的双门柜子',
  },
  'container.drawer': {
    assetStem: 'container-drawer',
    legacyIcon: 'Layers',
    description: '抽屉微微打开的三层斗柜',
  },
  'container.box': {
    assetStem: 'container-box',
    legacyIcon: 'Box',
    description: '带盖和把手的收纳箱',
  },
  'container.shelf': {
    assetStem: 'container-shelf',
    legacyIcon: 'Grid2x2',
    description: '摆放少量收纳篮的三层置物架',
  },
  'container.fridge': {
    assetStem: 'container-fridge',
    legacyIcon: 'Refrigerator',
    description: '圆润简洁的双门冰箱',
  },
  'container.bag': {
    assetStem: 'container-bag',
    legacyIcon: 'ShoppingBag',
    description: '带提手的软质收纳包',
  },
  'item.digital': {
    assetStem: 'item-digital',
    legacyIcon: 'MonitorSmartphone',
    description: '电脑、手机和耳机组合',
  },
  'item.clothing': {
    assetStem: 'item-clothing',
    legacyIcon: 'Shirt',
    description: '服饰、鞋和包袋组合',
  },
  'item.books': {
    assetStem: 'item-books',
    legacyIcon: 'BookOpen',
    description: '书本、笔记本和铅笔组合',
  },
  'item.kitchen': {
    assetStem: 'item-kitchen',
    legacyIcon: 'Utensils',
    description: '锅具、餐盘和锅铲组合',
  },
  'item.appliances': {
    assetStem: 'item-appliances',
    legacyIcon: 'Tv',
    description: '水壶、吸尘器和电视组合',
  },
  'item.tools': {
    assetStem: 'item-tools',
    legacyIcon: 'Wrench',
    description: '工具箱和常用五金工具组合',
  },
  'item.cleaning': {
    assetStem: 'item-cleaning',
    legacyIcon: 'Sparkles',
    description: '喷壶、海绵和清洁刷组合',
  },
  'item.health': {
    assetStem: 'item-health',
    legacyIcon: 'Pill',
    description: '急救箱、药瓶和体温计组合',
  },
  'item.toys': {
    assetStem: 'item-toys',
    legacyIcon: 'ToyBrick',
    description: '积木、小汽车和玩偶组合',
  },
  'item.valuables': {
    assetStem: 'item-valuables',
    legacyIcon: 'Gift',
    description: '证件、纪念章和收藏盒组合',
  },
} as const;

export type CategoryPresetArtworkKey = keyof typeof CATEGORY_PRESET_ARTWORK;
export type CategoryPresetArtwork = (typeof CATEGORY_PRESET_ARTWORK)[CategoryPresetArtworkKey];

export type CategoryVisual =
  | { kind: 'preset'; presetKey: CategoryPresetArtworkKey; artwork: CategoryPresetArtwork }
  | { kind: 'customImage'; uri: string }
  | { kind: 'lucide'; icon: string };

export function isCategoryPresetArtworkKey(value: string | null | undefined): value is CategoryPresetArtworkKey {
  return Boolean(value && value in CATEGORY_PRESET_ARTWORK);
}

export function isCategoryImageUri(icon: string) {
  return /^https?:\/\//.test(icon) || icon.startsWith('/api/uploads/');
}

export function resolveCategoryVisual({
  presetKey,
  icon,
}: {
  presetKey?: string | null;
  icon: string;
}): CategoryVisual {
  if (isCategoryPresetArtworkKey(presetKey)) {
    const artwork = CATEGORY_PRESET_ARTWORK[presetKey];
    if (icon === artwork.legacyIcon) {
      return { kind: 'preset', presetKey, artwork };
    }
  }

  if (isCategoryImageUri(icon)) {
    return { kind: 'customImage', uri: icon };
  }

  return { kind: 'lucide', icon };
}

export function getCategoryPresetLegacyIcon(presetKey: string | null | undefined) {
  return isCategoryPresetArtworkKey(presetKey) ? CATEGORY_PRESET_ARTWORK[presetKey].legacyIcon : null;
}
