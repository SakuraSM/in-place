import { createAiApi } from '@inplace/app-core';
import type { AIRecognitionResult } from '@inplace/domain';
import { apiRequest } from '../shared/api/client';

const AI_IMAGE_MAX_DIMENSION = 1280;
const AI_IMAGE_TARGET_BYTES = 350 * 1024;
const AI_IMAGE_INITIAL_QUALITY = 0.82;
const AI_IMAGE_MIN_QUALITY = 0.58;
const AI_IMAGE_QUALITY_STEP = 0.08;
const AI_IMAGE_DIMENSION_STEP = 0.85;
const AI_IMAGE_OUTPUT_TYPE = 'image/jpeg';

export async function recognizeItemFromImage(imageFile: File): Promise<AIRecognitionResult[]> {
  const compressedFile = await compressImageForAi(imageFile);
  return createAiApi(apiRequest).recognizeItemsFromPreparedImage(compressedFile);
}

export async function fetchAiAvailability(): Promise<boolean> {
  return createAiApi(apiRequest).fetchAiAvailability();
}

async function compressImageForAi(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    let { width, height } = fitWithin(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      AI_IMAGE_MAX_DIMENSION,
    );
    let quality = AI_IMAGE_INITIAL_QUALITY;

    while (true) {
      const blob = await renderCompressedBlob(image, width, height, quality);
      if (blob.size <= AI_IMAGE_TARGET_BYTES) {
        return createCompressedFile(file, blob);
      }

      if (quality > AI_IMAGE_MIN_QUALITY) {
        quality = Math.max(AI_IMAGE_MIN_QUALITY, quality - AI_IMAGE_QUALITY_STEP);
        continue;
      }

      const nextWidth = Math.max(1, Math.round(width * AI_IMAGE_DIMENSION_STEP));
      const nextHeight = Math.max(1, Math.round(height * AI_IMAGE_DIMENSION_STEP));
      if (nextWidth === width && nextHeight === height) {
        return createCompressedFile(file, blob);
      }

      width = nextWidth;
      height = nextHeight;
      quality = AI_IMAGE_INITIAL_QUALITY;
    }
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function renderCompressedBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法初始化图片压缩画布');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, AI_IMAGE_OUTPUT_TYPE, quality);
  });

  if (!blob) {
    throw new Error('图片压缩失败');
  }

  return blob;
}

function createCompressedFile(file: File, blob: Blob) {
  const nextName = replaceExtension(file.name, '.jpg');
  return new File([blob], nextName, {
    type: AI_IMAGE_OUTPUT_TYPE,
    lastModified: Date.now(),
  });
}

function replaceExtension(fileName: string, extension: string) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${fileName}${extension}`;
  }

  return `${fileName.slice(0, dotIndex)}${extension}`;
}

function fitWithin(width: number, height: number, maxDimension: number) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}
