import type { CategoryScope, Item, ItemCreateInput, ItemStatus, ItemType, TrackingMode } from '@inplace/domain';

export interface InventoryDraft {
  type: ItemType;
  isLocation: boolean;
  name: string;
  description: string;
  category: string;
  status: ItemStatus;
  price: string;
  quantity: string;
  trackingMode: TrackingMode;
  minimumQuantity: string;
  expiryDate: string;
  purchaseDate: string;
  warrantyDate: string;
  tags: string;
  images: string[];
  parentId: string | null;
  metadata: Record<string, unknown>;
}

export type InventoryDraftErrors = Partial<Record<keyof InventoryDraft, string>>;
export type InventoryDateField = 'expiryDate' | 'purchaseDate' | 'warrantyDate';
const DATE_FIELDS: readonly InventoryDateField[] = ['expiryDate', 'purchaseDate', 'warrantyDate'];
const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const INTEGER_PATTERN = /^\d+$/;
const NAME_LIMIT = 160;
const CATEGORY_LIMIT = 120;
const DESCRIPTION_LIMIT = 10_000;
const TAG_LIMIT = 80;

export function createInventoryDraft({ item, parentId, type = 'item' }: {
  item?: Item;
  parentId?: string | null;
  type?: ItemType;
} = {}): InventoryDraft {
  return {
    type: item?.type ?? type,
    isLocation: item?.type === 'container' && item.metadata.location_tag === true,
    name: item?.name ?? '', description: item?.description ?? '', category: item?.category ?? '',
    status: item?.status ?? 'in_stock', price: item?.price?.toString() ?? '',
    quantity: String(item?.quantity ?? 1), trackingMode: item?.tracking_mode ?? 'unique',
    minimumQuantity: item?.minimum_quantity?.toString() ?? '', expiryDate: item?.expiry_date?.slice(0, 10) ?? '',
    purchaseDate: item?.purchase_date?.slice(0, 10) ?? '', warrantyDate: item?.warranty_date?.slice(0, 10) ?? '',
    tags: item?.tags.join(', ') ?? '', images: [...(item?.images ?? [])],
    parentId: item ? item.parent_id : parentId ?? null, metadata: { ...(item?.metadata ?? {}) },
  };
}

export function getInventoryDraftScope(draft: Pick<InventoryDraft, 'type' | 'isLocation'>): CategoryScope {
  return draft.type === 'item' ? 'item' : draft.isLocation ? 'location' : 'container';
}

export function parseInventoryTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(/[,，]/).map((tag) => tag.trim()).filter((tag) => {
    const key = tag.toLocaleLowerCase('zh-CN');
    if (!tag || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isInventoryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isQuantity(value: string): boolean {
  return INTEGER_PATTERN.test(value.trim()) && Number.isSafeInteger(Number(value));
}

export function validateInventoryDraft(draft: InventoryDraft): InventoryDraftErrors {
  const errors: InventoryDraftErrors = {};
  if (!draft.name.trim()) errors.name = '请输入名称';
  else if (draft.name.trim().length > NAME_LIMIT) errors.name = `名称不能超过 ${NAME_LIMIT} 个字符`;
  if (draft.category.trim().length > CATEGORY_LIMIT) errors.category = `分类不能超过 ${CATEGORY_LIMIT} 个字符`;
  if (draft.description.trim().length > DESCRIPTION_LIMIT) errors.description = `描述不能超过 ${DESCRIPTION_LIMIT} 个字符`;
  if (draft.price.trim() && (!DECIMAL_PATTERN.test(draft.price.trim()) || !Number.isFinite(Number(draft.price)))) {
    errors.price = '请输入有效的非负价格';
  }
  if (!isQuantity(draft.quantity)) errors.quantity = '数量必须是非负整数';
  if (draft.minimumQuantity.trim() && !isQuantity(draft.minimumQuantity)) errors.minimumQuantity = '最低库存必须是非负整数';
  for (const field of DATE_FIELDS) {
    if (draft[field] && !isInventoryDate(draft[field])) errors[field] = '请输入有效日期，格式为 YYYY-MM-DD';
  }
  if (parseInventoryTags(draft.tags).some((tag) => tag.length > TAG_LIMIT)) errors.tags = `每个标签不能超过 ${TAG_LIMIT} 个字符`;
  return errors;
}

export class InventoryDraftValidationError extends Error {
  constructor(readonly fields: InventoryDraftErrors) {
    super(Object.values(fields)[0] ?? '请检查表单');
    this.name = 'InventoryDraftValidationError';
  }
}

export function toInventoryItemInput({ draft, userId }: { draft: InventoryDraft; userId: string }): ItemCreateInput {
  const errors = validateInventoryDraft(draft);
  if (Object.keys(errors).length) throw new InventoryDraftValidationError(errors);
  const metadata = { ...draft.metadata };
  if (draft.type === 'container' && draft.isLocation) metadata.location_tag = true;
  else delete metadata.location_tag;
  return {
    user_id: userId, parent_id: draft.parentId, type: draft.type,
    name: draft.name.trim(), description: draft.description.trim(), category: draft.category.trim(), status: draft.status,
    price: draft.price.trim() ? Number(draft.price) : null,
    quantity: Number(draft.quantity), tracking_mode: draft.trackingMode,
    minimum_quantity: draft.minimumQuantity.trim() ? Number(draft.minimumQuantity) : null,
    expiry_date: draft.expiryDate || null, purchase_date: draft.purchaseDate || null, warranty_date: draft.warrantyDate || null,
    images: [...draft.images], tags: parseInventoryTags(draft.tags), metadata,
  };
}
