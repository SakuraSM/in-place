import { executeBatch, type BatchResult } from '@inplace/app-core';
import type { Item, ItemCreateInput } from '@inplace/domain';
import type { DraftRecognition } from './ScanRecognitionResults';

interface SaveRecognitionDraftsInput {
  drafts: DraftRecognition[];
  userId: string;
  upload: (asset: { uri: string; fileName: string; mimeType: string }) => Promise<string>;
  create: (payload: ItemCreateInput) => Promise<Item>;
}

export async function saveRecognitionDrafts({
  drafts, userId, upload, create,
}: SaveRecognitionDraftsInput): Promise<BatchResult<Item>> {
  const pendingDrafts = drafts.filter((draft) => draft.selected && !draft.saved);
  if (pendingDrafts.length === 0) throw new Error('请至少选择一个识别结果');
  return executeBatch({
    entries: pendingDrafts,
    // The upload route allows one active image upload per user.
    concurrency: 1,
    identify: (draft) => draft.id,
    execute: async (draft) => {
      const imageUrl = draft.imageUri ? await upload({
        uri: draft.imageUri, fileName: `${draft.id}.jpg`, mimeType: 'image/jpeg',
      }) : null;
      return create({
        user_id: userId,
        parent_id: null,
        type: draft.result.type ?? 'item',
        name: draft.result.name,
        description: draft.result.description,
        category: draft.result.category,
        status: 'in_stock',
        price: draft.result.price ?? null,
        quantity: 1,
        tracking_mode: 'unique',
        minimum_quantity: null,
        expiry_date: null,
        purchase_date: null,
        warranty_date: null,
        images: imageUrl ? [imageUrl] : [],
        tags: draft.result.tags,
        metadata: {
          ai_recognized: true,
          brand: draft.result.brand,
          source_image: 'mobile-scan',
          bounding_box: draft.result.boundingBox ?? null,
        },
      });
    },
  });
}

export function applySavedRecognitionDrafts(drafts: DraftRecognition[], result: BatchResult<Item>): DraftRecognition[] {
  const saved = new Map(result.succeeded.map((entry) => [entry.id, entry.value.id]));
  return drafts.map((draft) => saved.has(draft.id)
    ? { ...draft, saved: true, savedItemId: saved.get(draft.id) }
    : draft);
}
