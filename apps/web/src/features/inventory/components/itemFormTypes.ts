import type { ItemStatus, ItemType } from '../../../legacy/database.types';
import type { TrackingMode } from '@inplace/domain';

export interface ItemFormData {
  type: ItemType;
  isLocation: boolean;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  price: string;
  quantity: number;
  tracking_mode: TrackingMode;
  minimum_quantity: string;
  expiry_date: string;
  purchase_date: string;
  warranty_date: string;
  images: string[];
  tags: string[];
  parent_id: string | null;
  metadata: Record<string, unknown>;
}

export type UpdateItemFormField = <Key extends keyof ItemFormData>(
  key: Key,
  value: ItemFormData[Key],
) => void;
