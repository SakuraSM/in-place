import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import type { AppEnv } from '../env.js';
import { getAllowedAiBaseUrls, normalizeBaseUrl } from '../env.js';

const MAX_REDIRECTS = 3;

export class UnsafeAiProviderError extends Error {
  constructor(message = 'AI Provider 地址不在允许列表中') {
    super(message);
    this.name = 'UnsafeAiProviderError';
  }
}

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number);
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a === 169 && b === 254
    || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168
    || a === 100 && b >= 64 && b <= 127
    || a === 192 && b === 0 && (c === 0 || c === 2)
    || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)
    || a === 203 && b === 0 && c === 113
    || a >= 224;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase().split('%')[0] ?? '';
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc')
    || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized)
    || normalized.startsWith('ff') || normalized.startsWith('2001:db8:')
    || normalized.startsWith('::ffff:') && isPrivateIpv4(normalized.slice(7));
}

export function isPrivateAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? isPrivateIpv4(address) : family === 6 ? isPrivateIpv6(address) : true;
}

export function assertAllowedAiProviderUrl(rawUrl: string, env: AppEnv) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new UnsafeAiProviderError('AI Provider 必须使用无凭据的 HTTPS 地址');
  }
  const normalized = normalizeBaseUrl(url.toString());
  const allowed = getAllowedAiBaseUrls(env).some((baseUrl) =>
    normalized === baseUrl || normalized.startsWith(`${baseUrl}/`));
  if (!allowed) throw new UnsafeAiProviderError();
  return url;
}

async function resolvePublicAddress(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UnsafeAiProviderError('AI Provider 解析到了不允许的网络地址');
  }
  return addresses[0]!;
}

export async function readBoundedChunks(body: AsyncIterable<unknown>, maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > maxBytes) throw new Error('AI Provider 响应超过大小限制');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

type PinnedResult = { status: number; headers: Headers; bytes: Buffer };
type PinnedTransport = (url: URL, init: RequestInit, env: AppEnv, signal: AbortSignal) => Promise<PinnedResult>;

async function pinnedHttpsRequest(url: URL, init: RequestInit, env: AppEnv, signal: AbortSignal): Promise<PinnedResult> {
  const approved = await resolvePublicAddress(url);
  return new Promise<{ status: number; headers: Headers; bytes: Buffer }>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: init.method,
      headers: init.headers as Record<string, string>,
      signal,
      lookup: (_hostname, _options, callback) => callback(null, approved.address, approved.family),
    }, async (response) => {
      try {
        const bytes = await readBoundedChunks(response, env.AI_MAX_RESPONSE_BYTES);
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
          else if (value !== undefined) headers.set(name, String(value));
        }
        resolve({ status: response.statusCode ?? 500, headers, bytes });
      } catch (error) {
        request.destroy();
        reject(error);
      }
    });
    request.on('error', reject);
    if (typeof init.body === 'string' || Buffer.isBuffer(init.body) || init.body instanceof Uint8Array) {
      request.write(init.body);
    }
    request.end();
  });
}

async function parseJson(bytes: Buffer) {
  if (bytes.length === 0) return {};
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    throw new Error('AI Provider 返回了无效 JSON');
  }
}

export async function safeAiJsonRequest(
  rawUrl: string,
  init: RequestInit,
  env: AppEnv,
  transport: PinnedTransport = pinnedHttpsRequest,
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
  let currentUrl = rawUrl;
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const url = assertAllowedAiProviderUrl(currentUrl, env);
      const result = await transport(url, init, env, controller.signal);
      const response = new Response(new Uint8Array(result.bytes), { status: result.status, headers: result.headers });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirects === MAX_REDIRECTS) throw new UnsafeAiProviderError('AI Provider 重定向不合法');
        const redirectUrl = new URL(location, url);
        if (redirectUrl.origin !== url.origin) {
          throw new UnsafeAiProviderError('AI Provider 不允许跨域重定向');
        }
        currentUrl = redirectUrl.toString();
        continue;
      }
      return { response, payload: await parseJson(result.bytes) };
    }
    throw new UnsafeAiProviderError('AI Provider 重定向次数过多');
  } finally {
    clearTimeout(timer);
  }
}
