import { buildImageVariantUrl } from '../../../shared/lib/imageVariant';

export type InventoryImageScenario = 'icon' | 'card' | 'landscape-card' | 'detail' | 'detail-thumb';

const INVENTORY_IMAGE_OPTIONS: Record<InventoryImageScenario, Parameters<typeof buildImageVariantUrl>[1]> = {
  icon: { width: 96, height: 96, fit: 'cover', quality: 72, format: 'webp' },
  card: { width: 480, height: 480, fit: 'cover', quality: 76, format: 'webp' },
  'landscape-card': { width: 640, height: 480, fit: 'cover', quality: 76, format: 'webp' },
  detail: { width: 1440, height: 1440, fit: 'inside', quality: 86, format: 'webp' },
  'detail-thumb': { width: 160, height: 160, fit: 'cover', quality: 72, format: 'webp' },
};

export function buildInventoryImageUrl(
  url: string | null | undefined,
  scenario: InventoryImageScenario = 'card',
): string {
  return buildImageVariantUrl(url, INVENTORY_IMAGE_OPTIONS[scenario]);
}
