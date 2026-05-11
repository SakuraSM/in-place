import type { ActivityAction, ItemStatus, ItemType } from '@inplace/domain';

export type PresentationTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

export interface StatusPresentation {
  label: string;
  tone: PresentationTone;
  isAttentionRequired: boolean;
}

export interface LabelPresentation {
  label: string;
  tone: PresentationTone;
}

export const ITEM_STATUS_PRESENTATION: Record<ItemStatus, StatusPresentation> = {
  in_stock: {
    label: '在库',
    tone: 'success',
    isAttentionRequired: false,
  },
  borrowed: {
    label: '借出',
    tone: 'warning',
    isAttentionRequired: true,
  },
  worn_out: {
    label: '损耗',
    tone: 'danger',
    isAttentionRequired: false,
  },
};

export const ITEM_TYPE_PRESENTATION: Record<ItemType, LabelPresentation> = {
  item: {
    label: '物品',
    tone: 'neutral',
  },
  container: {
    label: '收纳',
    tone: 'brand',
  },
};

export const ACTIVITY_ACTION_PRESENTATION: Record<ActivityAction, LabelPresentation> = {
  manual_create: {
    label: '手动录入',
    tone: 'success',
  },
  ai_scan_create: {
    label: 'AI 录入',
    tone: 'brand',
  },
  update: {
    label: '修改',
    tone: 'warning',
  },
  delete: {
    label: '删除',
    tone: 'danger',
  },
};

export interface ColorOptionPresentation {
  value: string;
  label: string;
}

export const MANAGEMENT_COLOR_OPTIONS: readonly ColorOptionPresentation[] = [
  { value: 'sky', label: '天空蓝' },
  { value: 'emerald', label: '翡翠绿' },
  { value: 'amber', label: '琥珀黄' },
  { value: 'rose', label: '玫瑰红' },
  { value: 'violet', label: '紫罗兰' },
  { value: 'slate', label: '石板灰' },
] as const;
