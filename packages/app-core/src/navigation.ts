export type AppNavigationItemId =
  | 'home'
  | 'overview'
  | 'locations'
  | 'activity'
  | 'categories'
  | 'tags'
  | 'scan'
  | 'profile';

export type AppNavigationSection = 'inventory' | 'operations' | 'management' | 'account';

export interface AppNavigationItem {
  id: AppNavigationItemId;
  label: string;
  shortLabel: string;
  section: AppNavigationSection;
  priority: number;
  isDesktopPrimary: boolean;
  isMobilePrimary: boolean;
}

export const APP_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    id: 'home',
    label: '首页',
    shortLabel: '首页',
    section: 'inventory',
    priority: 10,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'overview',
    label: '总览',
    shortLabel: '总览',
    section: 'inventory',
    priority: 20,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'locations',
    label: '位置树',
    shortLabel: '位置',
    section: 'inventory',
    priority: 30,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'activity',
    label: '操作记录',
    shortLabel: '记录',
    section: 'operations',
    priority: 40,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'categories',
    label: '分类管理',
    shortLabel: '管理',
    section: 'management',
    priority: 50,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'tags',
    label: '标签管理',
    shortLabel: '标签',
    section: 'management',
    priority: 60,
    isDesktopPrimary: true,
    isMobilePrimary: false,
  },
  {
    id: 'scan',
    label: 'AI 扫描',
    shortLabel: '扫描',
    section: 'operations',
    priority: 70,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
  {
    id: 'profile',
    label: '我的',
    shortLabel: '我的',
    section: 'account',
    priority: 80,
    isDesktopPrimary: true,
    isMobilePrimary: true,
  },
] as const;

function sortNavigationItems(items: readonly AppNavigationItem[]): AppNavigationItem[] {
  return [...items].sort((current, next) => current.priority - next.priority);
}

export function getDesktopPrimaryNavigationItems(): AppNavigationItem[] {
  return sortNavigationItems(APP_NAVIGATION_ITEMS.filter((item) => item.isDesktopPrimary));
}

export function getMobilePrimaryNavigationItems(): AppNavigationItem[] {
  return sortNavigationItems(APP_NAVIGATION_ITEMS.filter((item) => item.isMobilePrimary));
}
