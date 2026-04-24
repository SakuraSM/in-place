# 上传 / 缩略图 服务

## 概览

服务端通过 Fastify 提供两个能力：

- `POST /api/v1/uploads/images`：上传图片到 `storage/uploads/<userId>/<yyyy-mm-dd>/<uuid>.<ext>`，并返回完整 URL。
- `GET  /api/uploads/<path>`：公开访问已上传的原图（由 `@fastify/static` 提供）。

在第二个能力之上，附加了**动态缩放**：当请求带任意缩放参数时，
处理器会用 [`sharp`](https://sharp.pixelplumbing.com/) 实时生成缩略图并落盘缓存，
后续相同参数的请求直接命中缓存返回。

## 缩放参数

请求 `GET /api/uploads/<path>?<query>` 时，下列参数会触发缩放：

| 参数     | 取值                                            | 说明                                                                                  |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `w`      | 1 – 2048                                        | 目标宽度（像素）；服务端会向上对齐到固定桶值（64/96/128/192/256/384/512/768/1024/1536/2048） |
| `h`      | 1 – 2048                                        | 目标高度（像素），同样会向上对齐到上述桶                                                 |
| `q`      | 1 – 100                                         | 输出质量；会向上对齐到 50/60/70/80/90，默认 80                                          |
| `fit`    | `cover` / `contain` / `fill` / `inside` / `outside` | 与 sharp 同名，默认 `cover`                                                          |
| `format` | `jpeg` / `png` / `webp` / `avif`                | 强制输出格式；不传则保持原图格式                                                       |

> 桶化的目的：限制单张原图可生成的变体数量上限，避免恶意客户端通过任意改变 `w/h` 不断触发缩放计算与磁盘写入。

不带任何缩放参数时仍走原图直出，行为与改动前完全一致。

### 示例

```
/api/uploads/u1/20240101/abc.jpg?w=240            # 240px 宽缩略图
/api/uploads/u1/20240101/abc.jpg?w=480&h=480&fit=cover&q=70
/api/uploads/u1/20240101/abc.jpg?format=webp      # 同尺寸但更小体积
```

## 缓存策略

- 缓存目录：`storage/uploads/.cache/<前缀>/<sha1>.<ext>`
- 缓存键由「源文件相对路径 + 源文件 mtime + 全部缩放参数」摘要而来，源图被覆盖即自动失效
- 响应头：`Cache-Control: public, max-age=31536000, immutable`，便于 CDN / 浏览器长期缓存
- `.cache` 是 dotfile，`@fastify/static` 默认不会将其作为静态资源对外暴露

## Web 端帮助函数

`apps/web/src/shared/lib/imageVariant.ts` 暴露 `buildImageVariantUrl(url, options)`：

```ts
import { buildImageVariantUrl } from '@/shared/lib/imageVariant';

const thumb = buildImageVariantUrl(item.imageUrl, { width: 240, format: 'webp' });
```

对非 `/api/uploads/` 的 URL（例如 `data:`、`blob:`、外链）会原样返回，
组件可以无脑替换 `<img src={...}>` 而不必担心向后兼容问题。
