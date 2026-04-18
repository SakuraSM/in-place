import multipart from '@fastify/multipart';
import type { FastifyPluginAsync } from 'fastify';
import type { AppEnv } from '../../env.js';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import {
  deleteAiSettingsForUser,
  getPublicAiSettingsForUser,
  resolveEffectiveAiConfigForUser,
  upsertAiSettingsForUser,
} from './ai-settings.repository.js';
import { updateAiSettingsSchema } from './ai-settings.schemas.js';
import { AiRecognitionError, recognizeItemsFromImage } from './ai.service.js';

export const aiRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  await app.register(multipart, {
    limits: {
      fileSize: options.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
      files: 1,
    },
  });

  app.get('/status', { preHandler: app.authenticate }, async (request) => {
    const currentUser = request.currentUser;
    if (!currentUser) {
      return {
        enabled: false,
        model: options.env.OPENAI_MODEL,
        baseUrl: options.env.OPENAI_BASE_URL,
        source: 'env' as const,
      };
    }

    const config = await resolveEffectiveAiConfigForUser(currentUser.id, options.env);

    return {
      enabled: Boolean(config?.apiKey),
      model: config?.model ?? options.env.OPENAI_MODEL,
      baseUrl: config?.baseUrl ?? options.env.OPENAI_BASE_URL,
      source: config?.source ?? 'env',
    };
  });

  app.get('/settings', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    return reply.send({
      data: await getPublicAiSettingsForUser(currentUser.id, options.env),
    });
  });

  app.put('/settings', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = updateAiSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const payload = {
      ...(parsed.data.baseUrl !== undefined ? { baseUrl: parsed.data.baseUrl } : {}),
      ...(parsed.data.model !== undefined ? { model: parsed.data.model } : {}),
      ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}),
    };

    await upsertAiSettingsForUser(currentUser.id, payload, options.env);

    return reply.send({
      data: await getPublicAiSettingsForUser(currentUser.id, options.env),
    });
  });

  app.delete('/settings', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    await deleteAiSettingsForUser(currentUser.id);
    return reply.code(204).send();
  });

  app.post('/recognize', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const config = await resolveEffectiveAiConfigForUser(currentUser.id, options.env);
    if (!config) {
      return reply.code(503).send({
        error: 'AI_NOT_CONFIGURED',
        message: 'AI 识别未配置，请在个人中心设置服务端 AI 配置',
      });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({
        error: 'FILE_REQUIRED',
        message: '请上传需要识别的图片',
      });
    }

    if (!file.mimetype.startsWith('image/')) {
      return reply.code(400).send({
        error: 'INVALID_FILE_TYPE',
        message: '仅支持图片识别',
      });
    }

    try {
      const imageBuffer = await streamToBuffer(file.file);
      const items = await recognizeItemsFromImage({
        config,
        imageBuffer,
        mimeType: file.mimetype,
      });

      return reply.send({ items });
    } catch (error) {
      app.log.warn({
        error,
        type: error instanceof AiRecognitionError ? error.name : 'UnhandledAiRecognitionError',
        details: error instanceof AiRecognitionError ? error.details : undefined,
        debug: error instanceof AiRecognitionError ? error.debug : undefined,
        model: config.model,
        baseUrl: config.baseUrl,
      }, 'AI recognition failed');

      return reply.code(502).send({
        error: 'AI_RECOGNITION_FAILED',
        message: error instanceof Error ? error.message : 'AI 识别失败',
      });
    }
  });
};

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
