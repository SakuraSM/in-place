import { createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import type { AppEnv } from '../env.js';

const DEFAULT_UPLOAD_DIR = './storage/uploads';
const RESIZE_CACHE_DIRNAME = '.cache';

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
  return path.resolve(process.cwd(), DEFAULT_UPLOAD_DIR);
}

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

const DEFAULT_QUALITY = 80;

const FORMAT_TO_MIME: Record<NonNullable<ImageResizeOptions['format']>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const MIME_TO_FORMAT: Record<string, NonNullable<ImageResizeOptions['format']>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'webp',
};

const FORMAT_TO_EXTENSION: Record<NonNullable<ImageResizeOptions['format']>, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
  avif: '.avif',
};

export async function resolveResizedImage(input: {
  env: AppEnv;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  sourceMtimeMs: number;
  sourceMimeType: string;
  options: ImageResizeOptions;
}): Promise<{ absolutePath: string; size: number; mimeType: string }> {
  const targetFormat: NonNullable<ImageResizeOptions['format']> =
    input.options.format ?? MIME_TO_FORMAT[input.sourceMimeType] ?? 'jpeg';
  const quality = input.options.quality ?? DEFAULT_QUALITY;
  const fit = input.options.fit ?? 'cover';

  const cacheKey = createHash('sha1')
    .update(input.sourceRelativePath)
    .update('|')
    .update(String(Math.round(input.sourceMtimeMs)))
    .update('|')
    .update(`w=${input.options.width ?? ''}`)
    .update('|')
    .update(`h=${input.options.height ?? ''}`)
    .update('|')
    .update(`q=${quality}`)
    .update('|')
    .update(`fit=${fit}`)
    .update('|')
    .update(`fmt=${targetFormat}`)
    .digest('hex');

  const cacheRoot = path.join(resolveUploadRoot(input.env), RESIZE_CACHE_DIRNAME);
  const cacheDir = path.join(cacheRoot, cacheKey.slice(0, 2));
  const cachePath = path.join(cacheDir, `${cacheKey}${FORMAT_TO_EXTENSION[targetFormat]}`);

  try {
    const cached = await stat(cachePath);
    if (cached.isFile()) {
      return { absolutePath: cachePath, size: cached.size, mimeType: FORMAT_TO_MIME[targetFormat] };
    }
  } catch {
    // 缓存未命中，继续生成
  }

  await mkdir(cacheDir, { recursive: true });

  let pipelineSharp = sharp(input.sourceAbsolutePath, {
    // 不在解码层抛错（仅在 sharp 检测到完全无法解析的输入时报错）。
    // 上传时已限制 mimetype 必须是 image/*，外加上传根目录路径校验，
    // 此处放宽是为了兼容轻微元数据异常但仍能渲染的图片。
    failOn: 'none',
  }).rotate();
  if (input.options.width || input.options.height) {
    pipelineSharp = pipelineSharp.resize({
      width: input.options.width,
      height: input.options.height,
      fit,
      withoutEnlargement: true,
    });
  }

  switch (targetFormat) {
    case 'jpeg':
      pipelineSharp = pipelineSharp.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipelineSharp = pipelineSharp.png({ quality, compressionLevel: 9 });
      break;
    case 'webp':
      pipelineSharp = pipelineSharp.webp({ quality });
      break;
    case 'avif':
      pipelineSharp = pipelineSharp.avif({ quality });
      break;
  }

  // 先写入临时文件再原子重命名，避免并发请求读取到不完整的内容
  const tmpPath = `${cachePath}.${randomUUID()}.tmp`;
  await pipelineSharp.toFile(tmpPath);
  const { rename, unlink } = await import('node:fs/promises');
  try {
    await rename(tmpPath, cachePath);
  } catch (error) {
    // 仅吞掉"目标已存在"的并发竞态错误（EEXIST）；
    // 其它错误（权限、磁盘满等）应直接抛出便于运维定位。
    const code = (error as NodeJS.ErrnoException | null)?.code;
    await unlink(tmpPath).catch(() => undefined);
    if (code !== 'EEXIST') {
      throw error;
    }
    const cached = await stat(cachePath).catch(() => null);
    if (!cached) throw error;
  }

  const finalStat = await stat(cachePath);
  return { absolutePath: cachePath, size: finalStat.size, mimeType: FORMAT_TO_MIME[targetFormat] };
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
