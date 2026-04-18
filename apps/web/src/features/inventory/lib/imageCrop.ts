import type { AIRecognitionResult } from '../../../legacy/database.types';

export interface NormalizedCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const JPEG_OUTPUT_TYPE = 'image/jpeg';
const JPEG_QUALITY = 0.88;
const AUTO_CROP_PADDING = 0.04;

export async function cropImageFromFile(
  file: File,
  cropBox: NormalizedCropBox,
  fileNamePrefix = 'crop',
): Promise<File> {
  const image = await loadImageFromFile(file);

  try {
    const naturalCrop = normalizedToNaturalCrop(cropBox, image.naturalWidth || image.width, image.naturalHeight || image.height);
    const canvas = document.createElement('canvas');
    canvas.width = naturalCrop.width;
    canvas.height = naturalCrop.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法初始化裁图画布');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      naturalCrop.x,
      naturalCrop.y,
      naturalCrop.width,
      naturalCrop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, JPEG_OUTPUT_TYPE, JPEG_QUALITY);
    });

    if (!blob) {
      throw new Error('裁图失败');
    }

    return new File([blob], `${fileNamePrefix}.jpg`, {
      type: JPEG_OUTPUT_TYPE,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export function normalizeBoundingBox(result: AIRecognitionResult): NormalizedCropBox | null {
  const box = result.boundingBox;
  if (!box) {
    return null;
  }

  return expandCropBox(clampCropBox({
    x: box.x / 1000,
    y: box.y / 1000,
    width: box.width / 1000,
    height: box.height / 1000,
  }), AUTO_CROP_PADDING);
}

export function clampCropBox(box: NormalizedCropBox): NormalizedCropBox {
  const x = clamp01(box.x);
  const y = clamp01(box.y);
  const width = clamp01(box.width);
  const height = clamp01(box.height);

  return {
    x,
    y,
    width: Math.max(0.05, Math.min(width, 1 - x)),
    height: Math.max(0.05, Math.min(height, 1 - y)),
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

export function fullImageCropBox(): NormalizedCropBox {
  return {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
}

export async function createObjectUrl(file: File) {
  return URL.createObjectURL(file);
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

function loadImageFromFile(file: File) {
  const imageUrl = URL.createObjectURL(file);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = imageUrl;
  });
}
