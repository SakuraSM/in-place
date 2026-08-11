import type { ItemCreateInput } from '@inplace/domain';
import type { Item, ItemType } from '../../../legacy/database.types';
import { isLocationItem, updateLocationMetadata } from '../lib/locationTag';
import type { ItemFormData } from './itemFormTypes';

interface InitialItemFormDataInput {
  initial?: Partial<Item>;
  defaultParentId?: string | null;
  defaultType: ItemType;
  forceType?: ItemType;
  fixedLocation: boolean;
}

export function createInitialItemFormData({
  initial,
  defaultParentId,
  defaultType,
  forceType,
  fixedLocation,
}: InitialItemFormDataInput): ItemFormData {
  return {
    type: forceType ?? initial?.type ?? defaultType,
    isLocation: fixedLocation || isLocationItem(initial as Item | undefined),
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    status: initial?.status ?? 'in_stock',
    price: initial?.price?.toString() ?? '',
    quantity: initial?.quantity ?? 1,
    tracking_mode: initial?.tracking_mode ?? 'unique',
    minimum_quantity: initial?.minimum_quantity?.toString() ?? '',
    expiry_date: initial?.expiry_date ?? '',
    purchase_date: initial?.purchase_date ?? '',
    warranty_date: initial?.warranty_date ?? '',
    images: initial?.images ?? [],
    tags: initial?.tags ?? [],
    parent_id: initial?.parent_id !== undefined ? initial.parent_id : defaultParentId ?? null,
    metadata: initial?.metadata ?? {},
  };
}

export function toItemCreateInput(form: ItemFormData, userId: string): ItemCreateInput {
  return {
    user_id: userId,
    parent_id: form.parent_id,
    type: form.type,
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    status: form.status,
    price: form.price ? Number.parseFloat(form.price) : null,
    quantity: form.quantity,
    tracking_mode: form.tracking_mode,
    minimum_quantity: form.minimum_quantity === '' ? null : Number(form.minimum_quantity),
    expiry_date: form.expiry_date || null,
    purchase_date: form.purchase_date || null,
    warranty_date: form.warranty_date || null,
    images: form.images,
    tags: form.tags,
    metadata: updateLocationMetadata(
      form.metadata,
      form.type === 'container' && form.isLocation,
    ),
  };
}
