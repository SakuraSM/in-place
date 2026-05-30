import React from 'react';
import {
  Archive,
  Armchair,
  Baby,
  BadgeHelp,
  Bath,
  Bike,
  BookOpen,
  Box,
  Camera,
  Car,
  ChefHat,
  CircleEllipsis,
  Coffee,
  Cpu,
  Drill,
  Dumbbell,
  FerrisWheel,
  FolderTree,
  Gift,
  Gamepad2,
  Grid2x2,
  HardDrive,
  Home,
  LampDesk,
  Layers,
  Leaf,
  Lightbulb,
  MonitorSmartphone,
  Music,
  Palette,
  PackageSearch,
  PawPrint,
  Pill,
  Plug,
  Scissors,
  Shirt,
  ShoppingBag,
  Sofa,
  Sparkles,
  SprayCan,
  TentTree,
  ToyBrick,
  Tv,
  Utensils,
  Wrench,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ElementType> = {
  FolderTree,
  Grid2x2,
  Box,
  Home,
  Archive,
  Layers,
  PackageSearch,
  Shirt,
  BookOpen,
  Wrench,
  Gamepad2,
  Utensils,
  Tv,
  Dumbbell,
  Leaf,
  Car,
  Music,
  Camera,
  Coffee,
  HardDrive,
  LampDesk,
  Lightbulb,
  MonitorSmartphone,
  ShoppingBag,
  Sparkles,
  Gift,
  Sofa,
  Armchair,
  Palette,
  ToyBrick,
  TentTree,
  Bike,
  ChefHat,
  Plug,
  Cpu,
  Drill,
  Scissors,
  PawPrint,
  Pill,
  Bath,
  SprayCan,
  Baby,
  FerrisWheel,
  BadgeHelp,
  CircleEllipsis,
};

export const ICON_OPTIONS = [
  { key: 'FolderTree', label: '树状分类' },
  { key: 'Grid2x2', label: '网格分组' },
  { key: 'Layers', label: '层级分层' },
  { key: 'Box', label: '收纳盒' },
  { key: 'Home', label: '空间归属' },
  { key: 'Archive', label: '归档' },
  { key: 'PackageSearch', label: '查找物品' },
  { key: 'Shirt', label: '服饰' },
  { key: 'BookOpen', label: '书籍' },
  { key: 'Wrench', label: '工具' },
  { key: 'Gamepad2', label: '玩具' },
  { key: 'Utensils', label: '餐厨' },
  { key: 'Tv', label: '家电' },
  { key: 'Dumbbell', label: '运动' },
  { key: 'Leaf', label: '植物' },
  { key: 'Car', label: '出行' },
  { key: 'Music', label: '音乐' },
  { key: 'Camera', label: '影像' },
  { key: 'Coffee', label: '生活' },
  { key: 'HardDrive', label: '数码存储' },
  { key: 'LampDesk', label: '桌面用品' },
  { key: 'Lightbulb', label: '照明' },
  { key: 'MonitorSmartphone', label: '电子设备' },
  { key: 'ShoppingBag', label: '购物收纳' },
  { key: 'Sparkles', label: '美妆清洁' },
  { key: 'Gift', label: '礼物纪念' },
  { key: 'Sofa', label: '客厅家具' },
  { key: 'Armchair', label: '座椅家具' },
  { key: 'Palette', label: '手作美术' },
  { key: 'ToyBrick', label: '积木模型' },
  { key: 'TentTree', label: '户外露营' },
  { key: 'Bike', label: '骑行' },
  { key: 'ChefHat', label: '烘焙' },
  { key: 'Plug', label: '电源配件' },
  { key: 'Cpu', label: '电脑硬件' },
  { key: 'Drill', label: '电动工具' },
  { key: 'Scissors', label: '文具手工' },
  { key: 'PawPrint', label: '宠物用品' },
  { key: 'Pill', label: '药品护理' },
  { key: 'Bath', label: '卫浴清洁' },
  { key: 'SprayCan', label: '清洁喷雾' },
  { key: 'Baby', label: '母婴' },
  { key: 'FerrisWheel', label: '娱乐活动' },
  { key: 'BadgeHelp', label: '杂项收纳' },
  { key: 'CircleEllipsis', label: '其他' },
] as const;

export const COLOR_OPTIONS = [
  { key: 'sky', bg: 'bg-sky-50', text: 'text-sky-500', ring: 'ring-sky-400', label: '蓝' },
  { key: 'teal', bg: 'bg-teal-50', text: 'text-teal-500', ring: 'ring-teal-400', label: '青' },
  { key: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-500', ring: 'ring-emerald-400', label: '绿' },
  { key: 'amber', bg: 'bg-amber-50', text: 'text-amber-500', ring: 'ring-amber-400', label: '黄' },
  { key: 'rose', bg: 'bg-rose-50', text: 'text-rose-500', ring: 'ring-rose-400', label: '红' },
  { key: 'slate', bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-400', label: '灰' },
  { key: 'violet', bg: 'bg-violet-50', text: 'text-violet-500', ring: 'ring-violet-400', label: '紫' },
  { key: 'orange', bg: 'bg-orange-50', text: 'text-orange-500', ring: 'ring-orange-400', label: '橙' },
];

export function getColorClasses(colorKey: string) {
  return COLOR_OPTIONS.find((c) => c.key === colorKey) ?? COLOR_OPTIONS[5];
}

export function isCustomCategoryImageIcon(icon: string) {
  return /^https?:\/\//.test(icon) || icon.startsWith('/api/uploads/');
}

export function getCategoryIconLabel(icon: string) {
  if (isCustomCategoryImageIcon(icon)) {
    return '自定义图片';
  }

  return ICON_OPTIONS.find((item) => item.key === icon)?.label ?? icon;
}

export function CategoryIcon({
  icon,
  fallback: Fallback = Box,
  size = 18,
  className,
  imageClassName = 'h-full w-full object-cover',
}: {
  icon: string;
  fallback?: React.ElementType;
  size?: number;
  className?: string;
  imageClassName?: string;
}) {
  if (isCustomCategoryImageIcon(icon)) {
    return React.createElement('img', { src: icon, alt: '', className: imageClassName });
  }

  const IconComp = ICON_MAP[icon] ?? Fallback;
  return React.createElement(IconComp, { size, className });
}
