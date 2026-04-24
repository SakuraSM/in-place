import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../lib/authenticated-request.js';
import { resolveRequestOrigin } from '../lib/request-origin.js';
import {
  persistImageUpload,
  resolveImageMimeType,
  resolveUploadRoot,
  resolveResizedImage,
  type ImageResizeOptions,
} from '../lib/uploads.js';
import type { AppEnv } from '../env.js';

const MAX_DIMENSION = 2048;
// 仅允许一组离散的"桶"尺寸：客户端无论传入多少，服务端都向上取最接近的桶值。
// 该限制是缓存基数的上限（也意味着对同一原图最多生成 W×H×Q×fit×format 个变体），
// 防止攻击者通过任意改变 w/h 不断触发 sharp 计算 / 写入磁盘（CodeQL: js/missing-rate-limiting 的风险缓解）。
const DIMENSION_BUCKETS: ReadonlyArray<number> = [64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048];
const QUALITY_BUCKETS: ReadonlyArray<number> = [50, 60, 70, 80, 90];
const ALLOWED_FITS: ReadonlyArray<NonNullable<ImageResizeOptions['fit']>> = ['cover', 'contain', 'inside', 'outside', 'fill'];
const ALLOWED_FORMATS: ReadonlyArray<NonNullable<ImageResizeOptions['format']>> = ['jpeg', 'png', 'webp', 'avif'];

function snapToBucket(value: number, buckets: ReadonlyArray<number>): number {
  for (const bucket of buckets) {
    if (value <= bucket) return bucket;
  }
  return buckets[buckets.length - 1];
}

function parseDimension(value: unknown): number | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return snapToBucket(Math.min(parsed, MAX_DIMENSION), DIMENSION_BUCKETS);
}

function parseQuality(value: unknown): number | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return snapToBucket(Math.min(100, Math.max(1, parsed)), QUALITY_BUCKETS);
}

function parseFit(value: unknown): ImageResizeOptions['fit'] | undefined {
  if (typeof value !== 'string') return undefined;
  return (ALLOWED_FITS as ReadonlyArray<string>).includes(value) ? (value as ImageResizeOptions['fit']) : undefined;
}

function parseFormat(value: unknown): ImageResizeOptions['format'] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value === 'jpg' ? 'jpeg' : value;
  return (ALLOWED_FORMATS as ReadonlyArray<string>).includes(normalized)
    ? (normalized as ImageResizeOptions['format'])
    : undefined;
}

function hasResizeQuery(query: Record<string, unknown>): boolean {
  return Boolean(query.w || query.h || query.q || query.fit || query.format);
}

export const uploadRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  await app.register(multipart, {
    limits: {
      fileSize: options.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
      files: 1,
    },
  });

  const uploadRoot = resolveUploadRoot(options.env);

  await app.register(fastifyStatic, {
    root: uploadRoot,
    serve: false,
  });

  // 用单一路由同时承接原图和缩略图请求：无缩放参数时直接 sendFile，
  // 有缩放参数时按规则生成/命中缓存后的变体，避免与 fastify-static 的默认 /* 注册冲突。
  app.route({
    method: ['GET', 'HEAD'],
    url: '/api/uploads/*',
    async handler(request, reply) {
      const query = (request.query ?? {}) as Record<string, unknown>;
      const params = request.params as { '*'?: string };
      const relative = params['*'] ?? '';
      if (!relative) {
        return reply.code(400).send({ error: 'INVALID_PATH', message: '缺少图片路径' });
      }

      // 防止越过上传根目录（即 ../ 注入）
      const normalized = path.posix.normalize(relative);
      if (normalized.startsWith('..') || normalized.includes('\0')) {
        return reply.code(400).send({ error: 'INVALID_PATH', message: '非法的图片路径' });
      }
      const sourcePath = path.resolve(uploadRoot, normalized);
      const relSourceFromRoot = path.relative(uploadRoot, sourcePath);
      if (relSourceFromRoot.startsWith('..') || path.isAbsolute(relSourceFromRoot)) {
        return reply.code(400).send({ error: 'INVALID_PATH', message: '非法的图片路径' });
      }

      if (!hasResizeQuery(query)) {
        return reply.sendFile(normalized, uploadRoot);
      }

      let sourceStat;
      try {
        sourceStat = await stat(sourcePath);
      } catch {
        return reply.code(404).send({ error: 'NOT_FOUND', message: '图片不存在' });
      }
      if (!sourceStat.isFile()) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: '图片不存在' });
      }

      const sourceMime = resolveImageMimeType(sourcePath);
      if (!sourceMime.startsWith('image/') || sourceMime === 'image/svg+xml') {
        return reply.sendFile(normalized, uploadRoot);
      }

      const resizeOptions: ImageResizeOptions = {
        width: parseDimension(query.w),
        height: parseDimension(query.h),
        quality: parseQuality(query.q),
        fit: parseFit(query.fit),
        format: parseFormat(query.format),
      };

      if (!resizeOptions.width && !resizeOptions.height && !resizeOptions.format && !resizeOptions.quality) {
        return reply.sendFile(normalized, uploadRoot);
      }

      try {
        const resized = await resolveResizedImage({
          env: options.env,
          sourceAbsolutePath: sourcePath,
          sourceRelativePath: normalized,
          sourceMtimeMs: sourceStat.mtimeMs,
          sourceMimeType: sourceMime,
          options: resizeOptions,
        });

        reply
          .header('Content-Type', resized.mimeType)
          .header('Content-Length', resized.size)
          .header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.send(createReadStream(resized.absolutePath));
      } catch (error) {
        request.log.error({ err: error, path: normalized }, 'image resize failed');
        return reply.code(500).send({
          error: 'RESIZE_FAILED',
          message: error instanceof Error ? error.message : '图片缩放失败',
        });
      }
    },
  });

  app.post('/api/v1/uploads/images', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    let file;
    try {
      file = await request.file();
      if (!file) {
        return reply.code(400).send({
          error: 'FILE_REQUIRED',
          message: '请上传图片文件',
        });
      }
    } catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        return reply.code(413).send({
          error: 'FILE_TOO_LARGE',
          message: `图片不能超过 ${options.env.MAX_UPLOAD_SIZE_MB}MB，请压缩后重试`,
        });
      }

      throw error;
    }

    try {
      const uploaded = await persistImageUpload(file, currentUser.id, options.env);
      return reply.code(201).send({
        url: new URL(uploaded.publicUrl, resolveRequestOrigin(request)).toString(),
      });
    } catch (error) {
      return reply.code(400).send({
        error: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : '图片上传失败',
      });
    }
  });
};
