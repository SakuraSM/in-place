import { Archive, Box, MapPin, Package } from 'lucide-react';
import { INVENTORY_NODE_LABELS, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import type {
  OverviewStatusFilter,
  OverviewTypeFilter,
} from './overviewSearchParams';

export const OVERVIEW_TYPE_FILTERS: {
  value: OverviewTypeFilter;
  label: string;
  icon: typeof Archive;
}[] = [
  { value: 'all', label: '全部', icon: Archive },
  { value: 'location', label: INVENTORY_NODE_LABELS.location, icon: MapPin },
  { value: 'container', label: ITEM_TYPE_PRESENTATION.container.label, icon: Box },
  { value: 'item', label: ITEM_TYPE_PRESENTATION.item.label, icon: Package },
];

export const OVERVIEW_STATUS_FILTERS: {
  value: OverviewStatusFilter;
  label: string;
}[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: '在库' },
  { value: 'borrowed', label: '借出' },
  { value: 'worn_out', label: '损耗' },
];
