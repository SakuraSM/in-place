import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { AIRecognitionResult } from '@inplace/domain';

export interface NormalizedCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanSourceImage {
  uri: string;
  width: number;
  height: number;
}

const JPEG_COMPRESS_QUALITY = 0.88;
const AUTO_CROP_PADDING = 0.04;
const MIN_CROP_SIZE = 0.05;
const AI_BOX_SCALE = 1000;

export function normalizeBoundingBox(result: AIRecognitionResult): NormalizedCropBox | null {
  const box = result.boundingBox;
  if (!box) {
    return null;
  }

  return expandCropBox(clampCropBox({
    x: box.x / AI_BOX_SCALE,
    y: box.y / AI_BOX_SCALE,
    width: box.width / AI_BOX_SCALE,
    height: box.height / AI_BOX_SCALE,
  }), AUTO_CROP_PADDING);
}

export function fullImageCropBox(): NormalizedCropBox {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
}

export function clampCropBox(box: NormalizedCropBox): NormalizedCropBox {
  const x = clamp01(box.x);
  const y = clamp01(box.y);
  const width = clamp01(box.width);
  const height = clamp01(box.height);

  return {
    x,
    y,
    width: Math.max(MIN_CROP_SIZE, Math.min(width, 1 - x)),
    height: Math.max(MIN_CROP_SIZE, Math.min(height, 1 - y)),
  };
}

export function expandCropBox(box: NormalizedCropBox, padding: number): NormalizedCropBox {
  const safePadding = Math.max(0, padding);
  return clampCropBox({
    x: box.x - safePadding,
    y: box.y - safePadding,
    width: box.width + safePadding * 2,
    height: box.height + safePadding * 2,
  });
}

export async function cropImageFromUri(source: ScanSourceImage, cropBox: NormalizedCropBox) {
  const naturalCrop = normalizedToNaturalCrop(cropBox, source.width, source.height);
  return manipulateAsync(source.uri, [{
    crop: {
      originX: naturalCrop.x,
      originY: naturalCrop.y,
      width: naturalCrop.width,
      height: naturalCrop.height,
    },
  }], {
    compress: JPEG_COMPRESS_QUALITY,
    format: SaveFormat.JPEG,
  });
}

function normalizedToNaturalCrop(box: NormalizedCropBox, naturalWidth: number, naturalHeight: number) {
  const clamped = clampCropBox(box);
  const x = Math.round(clamped.x * naturalWidth);
  const y = Math.round(clamped.y * naturalHeight);
  const width = Math.max(1, Math.round(clamped.width * naturalWidth));
  const height = Math.max(1, Math.round(clamped.height * naturalHeight));

  return {
    x: Math.min(x, naturalWidth - 1),
    y: Math.min(y, naturalHeight - 1),
    width: Math.min(width, naturalWidth - x),
    height: Math.min(height, naturalHeight - y),
  };
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}
