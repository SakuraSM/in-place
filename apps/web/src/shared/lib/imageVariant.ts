// 给 `/api/uploads/...` 形式的图片 URL 追加缩放参数（w / h / q / fit / format），
// 触发服务端 sharp 缩放并返回缓存后的缩略图，用于列表、卡片预览等场景以减少流量。
//
// 示例：buildImageVariantUrl('/api/uploads/u1/abc.png', { width: 256, format: 'webp' })
//   => '/api/uploads/u1/abc.png?w=256&format=webp'
//
// 当传入的 URL 不指向上传服务、为 data:/blob: 协议或为空时，原样返回，
// 调用方无需做额外判断即可安全使用。

export interface ImageVariantOptions {
  width?: number;
  height?: number;
  /** 1-100，默认服务端为 80 */
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

const SUPPORTED_PATH_PREFIX = '/api/uploads/';

function isResizable(url: string): boolean {
  if (!url) return false;
  if (/^(data:|blob:|about:)/i.test(url)) return false;
  try {
    if (/^https?:/i.test(url)) {
      const parsed = new URL(url);
      return parsed.pathname.startsWith(SUPPORTED_PATH_PREFIX);
    }
  } catch {
    return false;
  }
  return url.startsWith(SUPPORTED_PATH_PREFIX);
}

export function buildImageVariantUrl(url: string | null | undefined, options: ImageVariantOptions = {}): string {
  if (!url) return '';
  if (!isResizable(url)) return url;

  const params = new URLSearchParams();
  if (options.width && options.width > 0) params.set('w', String(Math.round(options.width)));
  if (options.height && options.height > 0) params.set('h', String(Math.round(options.height)));
  if (options.quality && options.quality > 0) params.set('q', String(Math.round(options.quality)));
  if (options.fit) params.set('fit', options.fit);
  if (options.format) params.set('format', options.format);

  const query = params.toString();
  if (!query) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query}`;
}
