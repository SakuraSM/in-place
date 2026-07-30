const AMAP_REST_API_ORIGIN = 'https://restapi.amap.com';
const AMAP_WEB_API_ORIGIN = 'https://webapi.amap.com';
const AMAP_CUSTOM_STYLE_PATH_PREFIX = 'v4/map/styles';
const AMAP_REST_PATH_PREFIX = 'v3/';
const AMAP_PROXY_TIMEOUT_MS = 15_000;
const AMAP_MAX_RESPONSE_BYTES = 2_097_152;
const SAFE_AMAP_PATH_PATTERN = /^[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/;

interface AmapUpstreamUrlInput {
  path: string;
  queryString: string;
  apiKey: string;
  securityCode: string;
}

export interface AmapProxyResponse {
  status: number;
  contentType: string;
  cacheControl: string | null;
  body: Buffer;
}

function validateAmapPath(path: string): void {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    throw new Error('INVALID_AMAP_PROXY_PATH');
  }

  const pathSegments = decodedPath.split('/');
  const isAllowedPrefix = decodedPath.startsWith(AMAP_REST_PATH_PREFIX)
    || decodedPath === AMAP_CUSTOM_STYLE_PATH_PREFIX
    || decodedPath.startsWith(`${AMAP_CUSTOM_STYLE_PATH_PREFIX}/`);
  if (
    !isAllowedPrefix
    || !SAFE_AMAP_PATH_PATTERN.test(path)
    || pathSegments.includes('..')
    || decodedPath.includes('\\')
  ) {
    throw new Error('INVALID_AMAP_PROXY_PATH');
  }
}

export function buildAmapUpstreamUrl(input: AmapUpstreamUrlInput): URL {
  const {
    path,
    queryString,
    apiKey,
    securityCode,
  } = input;
  validateAmapPath(path);
  const upstreamOrigin = path.startsWith(AMAP_CUSTOM_STYLE_PATH_PREFIX)
    ? AMAP_WEB_API_ORIGIN
    : AMAP_REST_API_ORIGIN;
  const upstreamUrl = new URL(`/${path}`, upstreamOrigin);
  const inputSearchParams = new URLSearchParams(queryString);

  inputSearchParams.delete('key');
  inputSearchParams.delete('jscode');
  for (const [key, value] of inputSearchParams) {
    upstreamUrl.searchParams.append(key, value);
  }
  upstreamUrl.searchParams.set('key', apiKey);
  upstreamUrl.searchParams.set('jscode', securityCode);
  return upstreamUrl;
}

export async function requestAmapResource(url: URL): Promise<AmapProxyResponse> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(AMAP_PROXY_TIMEOUT_MS),
    headers: {
      Accept: 'application/json,image/*,*/*;q=0.8',
    },
  });
  const declaredResponseBytes = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredResponseBytes) && declaredResponseBytes > AMAP_MAX_RESPONSE_BYTES) {
    throw new Error('AMAP_RESPONSE_TOO_LARGE');
  }

  const responseBytes = new Uint8Array(await response.arrayBuffer());
  if (responseBytes.byteLength > AMAP_MAX_RESPONSE_BYTES) {
    throw new Error('AMAP_RESPONSE_TOO_LARGE');
  }

  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    cacheControl: response.headers.get('cache-control'),
    body: Buffer.from(responseBytes),
  };
}
