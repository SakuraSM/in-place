import { mkdir, readdir, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { AppEnv } from '../env.js';

const DEFAULT_UPLOAD_DIR = './storage/uploads';
const RESIZE_CACHE_DIRNAME = '.cache';
const RESIZE_CACHE_MAX_FILES = 2_000;
const RESIZE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
let lastResizeCachePruneAt = 0;
let resizeCachePrunePromise: Promise<void> | null = null;

export interface UploadedImageFile {
  file: NodeJS.ReadableStream;
  filename?: string;
  mimetype: string;
}

const ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
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

export async function resolveExistingUploadPath(env: AppEnv, encodedRelativePath: string) {
  const uploadRoot = resolveUploadRoot(env);
  let relativePath: string;
  try {
    relativePath = decodeURIComponent(encodedRelativePath);
  } catch {
    throw new Error('非法的上传文件路径');
  }
  if (!relativePath || relativePath.includes('\0') || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)) {
    throw new Error('非法的上传文件路径');
  }
  const absolutePath = path.resolve(uploadRoot, relativePath);
  const relativeFromRoot = path.relative(uploadRoot, absolutePath);
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    throw new Error('非法的上传文件路径');
  }

  const [realRoot, realFile] = await Promise.all([realpath(uploadRoot), realpath(absolutePath)]);
  const realRelative = path.relative(realRoot, realFile);
  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error('上传文件越过存储根目录');
  }
  return { absolutePath: realFile, relativePath };
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

async function pruneResizeCache(cacheRoot: string) {
  const now = Date.now();
  if (now - lastResizeCachePruneAt < 60_000) return;
  lastResizeCachePruneAt = now;
  if (resizeCachePrunePromise) return resizeCachePrunePromise;
  resizeCachePrunePromise = (async () => {
    const files: Array<{ path: string; mtimeMs: number }> = [];
    let directories;
    try {
      directories = await readdir(cacheRoot, { withFileTypes: true });
    } catch {
      return;
    }
    for (const directory of directories) {
      if (!directory.isDirectory()) continue;
      const directoryPath = path.join(cacheRoot, directory.name);
      const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (!entry.isFile() || entry.name.endsWith('.tmp')) continue;
        const filePath = path.join(directoryPath, entry.name);
        const fileStat = await stat(filePath).catch(() => null);
        if (fileStat) files.push({ path: filePath, mtimeMs: fileStat.mtimeMs });
      }
    }
    files.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const expired = files.filter((file) => now - file.mtimeMs > RESIZE_CACHE_MAX_AGE_MS);
    const nonExpired = files.filter((file) => now - file.mtimeMs <= RESIZE_CACHE_MAX_AGE_MS);
    const overflow = nonExpired.slice(0, Math.max(0, nonExpired.length - RESIZE_CACHE_MAX_FILES));
    await Promise.all([...new Set([...expired, ...overflow].map((file) => file.path))]
      .map((filePath) => unlink(filePath).catch(() => undefined)));
  })().finally(() => {
    resizeCachePrunePromise = null;
  });
  return resizeCachePrunePromise;
}

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
  await pruneResizeCache(cacheRoot);
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

async function ensureUserUploadDir(householdId: string, userId: string, env: AppEnv) {
  const uploadRoot = resolveUploadRoot(env);
  const relativeDir = path.join(householdId, userId, new Date().toISOString().slice(0, 10));
  const targetDir = path.join(uploadRoot, relativeDir);
  await mkdir(targetDir, { recursive: true });

  return {
    uploadRoot,
    relativeDir,
    targetDir,
  };
}

async function rasterizeImage(buffer: Buffer) {
  const image = sharp(buffer, { failOn: 'error', limitInputPixels: 16_000_000 });
  const metadata = await image.metadata();
  if (!metadata.format || metadata.format === 'svg') throw new Error('仅支持安全的栅格图片');
  return image.rotate().webp({ quality: 88 }).toBuffer();
}

async function readableToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function validateAttachmentPayload(mimeType: string, input: Buffer) {
  const header = input.subarray(0, 8).toString('hex');
  if (mimeType === 'application/pdf' && !input.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('PDF 文件内容与声明类型不一致');
  }
  if (mimeType === 'application/msword' && header !== 'd0cf11e0a1b11ae1') {
    throw new Error('Word 文件内容与声明类型不一致');
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    && !input.subarray(0, 2).equals(Buffer.from('PK'))) {
    throw new Error('Word 文件内容与声明类型不一致');
  }
  if (mimeType === 'text/plain') {
    if (input.includes(0)) throw new Error('文本附件包含不允许的二进制内容');
    new TextDecoder('utf-8', { fatal: true }).decode(input);
  }
}

export async function persistImageUpload(file: UploadedImageFile, householdId: string, userId: string, env: AppEnv) {
  const output = await rasterizeImage(await readableToBuffer(file.file));
  const { relativeDir, targetDir } = await ensureUserUploadDir(householdId, userId, env);
  const fileName = `${randomUUID()}.webp`;
  const targetPath = path.join(targetDir, fileName);
  await writeFile(targetPath, output);

  const normalizedRelativePath = `${relativeDir.split(path.sep).join('/')}/${fileName}`;

  return {
    absolutePath: targetPath,
    relativePath: normalizedRelativePath,
    publicUrl: `/api/uploads/${normalizedRelativePath}`,
  };
}

export async function persistAttachmentUpload(file: UploadedImageFile, householdId: string, userId: string, env: AppEnv) {
  if (!ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
    throw new Error('仅支持 PDF、图片、文本或 Word 文档');
  }

  const { relativeDir, targetDir } = await ensureUserUploadDir(householdId, userId, env);
  const input = await readableToBuffer(file.file);
  const isRaster = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  if (!isRaster) validateAttachmentPayload(file.mimetype, input);
  const output = isRaster ? await rasterizeImage(input) : input;
  const safeExtensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'image/jpeg': '.webp',
    'image/png': '.webp',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  const extension = safeExtensions[file.mimetype];
  if (!extension) throw new Error('不支持的附件类型');
  const fileName = `${randomUUID()}${extension}`;
  const targetPath = path.join(targetDir, fileName);
  await writeFile(targetPath, output);
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
}, householdId: string, userId: string, env: AppEnv) {
  const output = await rasterizeImage(input.buffer);
  const { relativeDir, targetDir } = await ensureUserUploadDir(householdId, userId, env);
  const fileName = `${randomUUID()}.webp`;
  const targetPath = path.join(targetDir, fileName);
  await writeFile(targetPath, output);

  const normalizedRelativePath = `${relativeDir.split(path.sep).join('/')}/${fileName}`;
  return {
    absolutePath: targetPath,
    relativePath: normalizedRelativePath,
    publicUrl: `/api/uploads/${normalizedRelativePath}`,
  };
}
