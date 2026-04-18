import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../lib/authenticated-request.js';
import { resolveRequestOrigin } from '../lib/request-origin.js';
import { persistImageUpload, resolveUploadRoot } from '../lib/uploads.js';
import type { AppEnv } from '../env.js';

export const uploadRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  await app.register(multipart, {
    limits: {
      fileSize: options.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(fastifyStatic, {
    root: resolveUploadRoot(options.env),
    prefix: '/api/uploads/',
    decorateReply: false,
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
