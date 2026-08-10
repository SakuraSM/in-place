import { Box, MapPin, Package, type LucideIcon } from 'lucide-react';
import { ITEM_STATUS_PRESENTATION } from '@inplace/app-core';
import type { ItemStatus } from '@inplace/domain';
import type { AssetMapNodeKind } from './assetMap';

export interface AssetMapKindPresentation {
  label: string;
  icon: LucideIcon;
  accentClassName: string;
  borderClassName: string;
  miniMapColor: string;
}

export const ASSET_MAP_KIND_PRESENTATION: Record<AssetMapNodeKind, AssetMapKindPresentation> = {
  location: {
    label: '位置',
    icon: MapPin,
    accentClassName: 'bg-sky-50 text-sky-700',
    borderClassName: 'border-sky-300',
    miniMapColor: '#0284c7',
  },
  container: {
    label: '收纳',
    icon: Box,
    accentClassName: 'bg-teal-50 text-teal-700',
    borderClassName: 'border-teal-300',
    miniMapColor: '#0f766e',
  },
  item: {
    label: '物品',
    icon: Package,
    accentClassName: 'bg-amber-50 text-amber-800',
    borderClassName: 'border-amber-300',
    miniMapColor: '#b45309',
  },
};

export const ASSET_MAP_STATUS_FILTERS: Array<{
  value: 'all' | ItemStatus;
  label: string;
}> = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(ITEM_STATUS_PRESENTATION).map(([value, presentation]) => ({
    value: value as ItemStatus,
    label: presentation.label,
  })),
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN');

export function formatAssetMapCurrency(value: number): string {
  return CURRENCY_FORMATTER.format(value);
}

export function formatAssetMapNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}
