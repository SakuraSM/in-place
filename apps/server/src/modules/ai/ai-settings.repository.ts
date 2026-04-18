import { userAiSettings } from '@inplace/db';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../../env.js';
import { getDb } from '../../lib/db.js';
import { decryptSecret, encryptSecret } from '../../lib/secret-box.js';
import type { UpdateAiSettingsInput } from './ai-settings.schemas.js';

export interface EffectiveAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  source: 'env' | 'user';
}

export interface PublicAiSettings {
  baseUrl: string;
  model: string;
  hasStoredApiKey: boolean;
  enabled: boolean;
  source: 'env' | 'user';
}

function resolveEncryptionSecret(env: AppEnv) {
  return env.APP_ENCRYPTION_KEY || env.JWT_SECRET;
}

async function findUserAiSettings(userId: string) {
  const [settings] = await getDb()
    .select()
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  return settings ?? null;
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

export async function getPublicAiSettingsForUser(userId: string, env: AppEnv): Promise<PublicAiSettings> {
  const settings = await findUserAiSettings(userId);
  return {
    baseUrl: settings?.baseUrl || env.OPENAI_BASE_URL,
    model: settings?.model || env.OPENAI_MODEL,
    hasStoredApiKey: Boolean(settings?.apiKeyEncrypted),
    enabled: Boolean(settings?.apiKeyEncrypted || env.OPENAI_API_KEY),
    source: settings ? 'user' : 'env',
  };
}

export async function resolveEffectiveAiConfigForUser(userId: string, env: AppEnv): Promise<EffectiveAiConfig | null> {
  const settings = await findUserAiSettings(userId);
  const apiKey = settings?.apiKeyEncrypted
    ? decryptSecret(settings.apiKeyEncrypted, resolveEncryptionSecret(env))
    : env.OPENAI_API_KEY || '';

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: settings?.baseUrl || env.OPENAI_BASE_URL,
    model: settings?.model || env.OPENAI_MODEL,
    source: settings ? 'user' : 'env',
  };
}

export async function upsertAiSettingsForUser(userId: string, input: UpdateAiSettingsInput, env: AppEnv) {
  const current = await findUserAiSettings(userId);
  const nextBaseUrl = input.baseUrl !== undefined ? normalizeOptionalText(input.baseUrl) : current?.baseUrl ?? null;
  const nextModel = input.model !== undefined ? normalizeOptionalText(input.model) : current?.model ?? null;
  const nextApiKeyEncrypted = input.apiKey !== undefined
    ? encryptSecret(input.apiKey.trim(), resolveEncryptionSecret(env))
    : current?.apiKeyEncrypted ?? null;

  const [saved] = await getDb()
    .insert(userAiSettings)
    .values({
      userId,
      apiKeyEncrypted: nextApiKeyEncrypted,
      baseUrl: nextBaseUrl,
      model: nextModel,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userAiSettings.userId,
      set: {
        apiKeyEncrypted: nextApiKeyEncrypted,
        baseUrl: nextBaseUrl,
        model: nextModel,
        updatedAt: new Date(),
      },
    })
    .returning();

  return saved ?? null;
}

export async function deleteAiSettingsForUser(userId: string) {
  const [deleted] = await getDb()
    .delete(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .returning({ id: userAiSettings.id });

  return deleted ?? null;
}
