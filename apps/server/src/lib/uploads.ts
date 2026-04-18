import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { AppEnv } from '../env.js';

export interface UploadedImageFile {
  file: NodeJS.ReadableStream;
  filename?: string;
  mimetype: string;
}

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

const IMAGE_MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(IMAGE_EXTENSION_BY_MIME).map(([mimeType, extension]) => [extension, mimeType]),
) as Record<string, string>;

function resolveExtension(file: UploadedImageFile) {
  const byMime = IMAGE_EXTENSION_BY_MIME[file.mimetype];
  if (byMime) {
    return byMime;
  }

  const originalExtension = path.extname(file.filename ?? '').toLowerCase();
  return originalExtension || '.bin';
}

export function resolveUploadRoot(env: AppEnv) {
  return path.resolve(process.cwd(), env.UPLOAD_DIR);
}

export function resolveImageMimeType(filename: string) {
  return IMAGE_MIME_BY_EXTENSION[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

async function ensureUserUploadDir(userId: string, env: AppEnv) {
  const uploadRoot = resolveUploadRoot(env);
  const relativeDir = path.join(userId, new Date().toISOString().slice(0, 10));
  const targetDir = path.join(uploadRoot, relativeDir);
  await mkdir(targetDir, { recursive: true });

  return {
    uploadRoot,
    relativeDir,
    targetDir,
  };
}

export async function persistImageUpload(file: UploadedImageFile, userId: string, env: AppEnv) {
  if (!file.mimetype.startsWith('image/')) {
    throw new Error('仅支持上传图片文件');
  }

  const { relativeDir, targetDir } = await ensureUserUploadDir(userId, env);

  const fileName = `${randomUUID()}${resolveExtension(file)}`;
  const targetPath = path.join(targetDir, fileName);

  await pipeline(file.file, createWriteStream(targetPath));

  const normalizedRelativePath = `${relativeDir.split(path.sep).join('/')}/${fileName}`;

  return {
    absolutePath: targetPath,
    relativePath: normalizedRelativePath,
    publicUrl: `/api/uploads/${normalizedRelativePath}`,
  };
}

export async function persistImageBuffer(input: {
  buffer: Buffer;
  filename?: string;
  mimetype: string;
}, userId: string, env: AppEnv) {
  if (!input.mimetype.startsWith('image/')) {
    throw new Error('仅支持上传图片文件');
  }

  const { relativeDir, targetDir } = await ensureUserUploadDir(userId, env);
  const extension = IMAGE_EXTENSION_BY_MIME[input.mimetype]
    ?? (path.extname(input.filename ?? '').toLowerCase() || '.bin');
  const fileName = `${randomUUID()}${extension}`;
  const targetPath = path.join(targetDir, fileName);

  await writeFile(targetPath, input.buffer);

  const normalizedRelativePath = `${relativeDir.split(path.sep).join('/')}/${fileName}`;
  return {
    absolutePath: targetPath,
    relativePath: normalizedRelativePath,
    publicUrl: `/api/uploads/${normalizedRelativePath}`,
  };
}
