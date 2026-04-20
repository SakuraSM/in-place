import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { resolveRequestOrigin } from '../../lib/request-origin.js';
import {
  createItemSchema,
  exportItemsQuerySchema,
  importInventorySchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from './item.schemas.js';
import {
  createItemForUser,
  deleteItemForUser,
  exportInventoryForUser,
  findItemByIdForUser,
  getItemStatsForUser,
  importInventoryForUser,
  itemHasChildrenForUser,
  listAncestorsForUser,
  listItemsForUser,
  updateItemForUser,
  validateParentForUser,
  wouldCreateParentCycleForUser,
} from './item.repository.js';
import type { AppEnv } from '../../env.js';
import { persistImageBuffer, resolveImageMimeType, resolveUploadRoot } from '../../lib/uploads.js';

interface ExportCategoryRecord {
  id: string;
  user_id: string;
  item_type: 'container' | 'item';
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

interface ExportTagRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface ExportItemRecord {
  id: string;
  user_id: string;
  parent_id: string | null;
  parent_name: string | null;
  path: string;
  type: 'container' | 'item';
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number | null;
  purchase_date: string | null;
  warranty_date: string | null;
  status: 'in_stock' | 'borrowed' | 'worn_out';
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ExportSnapshot {
  version: '1' | '2';
  exported_at: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
  };
  categories: ExportCategoryRecord[];
  tags: ExportTagRecord[];
  items: ExportItemRecord[];
  image_assets?: Record<string, {
    filename: string;
    mime_type: string;
    data_base64: string;
  }>;
}

function sanitizeFileTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function buildItemPath(itemId: string, itemMap: Map<string, {
  id: string;
  parentId: string | null;
  name: string;
}>) {
  const segments: string[] = [];
  const visited = new Set<string>();
  let currentId = itemMap.get(itemId)?.parentId ?? null;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const current = itemMap.get(currentId);
    if (!current) {
      break;
    }

    segments.unshift(current.name);
    currentId = current.parentId;
  }

  return segments.join(' / ');
}

function toExportItemRecords(rows: Awaited<ReturnType<typeof exportInventoryForUser>>['items']): ExportItemRecord[] {
  const itemMap = new Map(rows.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    parent_id: row.parentId,
    parent_name: row.parentId ? itemMap.get(row.parentId)?.name ?? null : null,
    path: buildItemPath(row.id, itemMap),
    type: row.type,
    name: row.name,
    description: row.description,
    category: row.category,
    quantity: row.quantity,
    price: row.price === null ? null : Number(row.price),
    purchase_date: row.purchaseDate ? row.purchaseDate.toISOString() : null,
    warranty_date: row.warrantyDate ? row.warrantyDate.toISOString() : null,
    status: row.status,
    images: row.images,
    tags: row.tags,
    metadata: row.metadata,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }));
}

function toExportCategories(rows: Awaited<ReturnType<typeof exportInventoryForUser>>['categories']): ExportCategoryRecord[] {
  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    item_type: row.itemType,
    name: row.name,
    icon: row.icon,
    color: row.color,
    created_at: row.createdAt.toISOString(),
  }));
}

function toExportTags(rows: Awaited<ReturnType<typeof exportInventoryForUser>>['tags']): ExportTagRecord[] {
  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    description: row.description,
    color: row.color,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }));
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildExportCsv(items: ExportItemRecord[]) {
  const headers = [
    'id',
    'user_id',
    'parent_id',
    'parent_name',
    'path',
    'type',
    'name',
    'description',
    'category',
    'quantity',
    'price',
    'purchase_date',
    'warranty_date',
    'status',
    'images',
    'tags',
    'metadata',
    'created_at',
    'updated_at',
  ];

  const lines = items.map((item) => [
    item.id,
    item.user_id,
    item.parent_id,
    item.parent_name,
    item.path,
    item.type,
    item.name,
    item.description,
    item.category,
    item.quantity,
    item.price,
    item.purchase_date,
    item.warranty_date,
    item.status,
    item.images.join(' | '),
    item.tags.join(' | '),
    JSON.stringify(item.metadata),
    item.created_at,
    item.updated_at,
  ].map(escapeCsv).join(','));

  return [headers.join(','), ...lines].join('\n');
}

async function buildImageAssets(input: {
  items: ExportItemRecord[];
  env: AppEnv;
  origin: string;
}) {
  const uploadRoot = resolveUploadRoot(input.env);
  const assets = new Map<string, {
    filename: string;
    mime_type: string;
    data_base64: string;
  }>();

  for (const item of input.items) {
    for (const imageUrl of item.images) {
      if (assets.has(imageUrl)) {
        continue;
      }

      try {
        const url = new URL(imageUrl);
        if (url.origin !== input.origin || !url.pathname.startsWith('/api/uploads/')) {
          continue;
        }

        const relativePath = decodeURIComponent(url.pathname.replace(/^\/api\/uploads\//, ''));
        const absolutePath = path.join(uploadRoot, relativePath);
        const buffer = await readFile(absolutePath);
        assets.set(imageUrl, {
          filename: path.basename(relativePath),
          mime_type: resolveImageMimeType(relativePath),
          data_base64: buffer.toString('base64'),
        });
      } catch {
        continue;
      }
    }
  }

  return Object.fromEntries(assets);
}

export const itemRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = listItemsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: parsed.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send({
      ...(await listItemsForUser(currentUser.id, parsed.data)),
    });
  });

  app.get('/stats', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    return reply.send({
      data: await getItemStatsForUser(currentUser.id),
    });
  });

  app.get('/export', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = exportItemsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: parsed.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    const exportedAt = new Date().toISOString();
    const inventory = await exportInventoryForUser(currentUser.id);
    const itemRecords = toExportItemRecords(inventory.items);
    const baseFilename = `inplace-inventory-${sanitizeFileTimestamp(new Date())}`;

    if (parsed.data.format === 'csv') {
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${baseFilename}.csv"`)
        .send(buildExportCsv(itemRecords));
    }

    const payload: ExportSnapshot = {
      version: '2',
      exported_at: exportedAt,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        display_name: currentUser.displayName ?? null,
      },
      categories: toExportCategories(inventory.categories),
      tags: toExportTags(inventory.tags),
      items: itemRecords,
      image_assets: await buildImageAssets({
        items: itemRecords,
        env: options.env,
        origin: resolveRequestOrigin(request),
      }),
    };

    return reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${baseFilename}.json"`)
      .send(payload);
  });

  app.post('/import', {
    preHandler: app.authenticate,
    bodyLimit: options.env.BACKUP_PAYLOAD_SIZE_MB * 1024 * 1024,
  }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = importInventorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '导入文件格式不合法',
      });
    }

    try {
      const imageUrlMap = new Map<string, string>();

      if (parsed.data.image_assets) {
        for (const [originalUrl, asset] of Object.entries(parsed.data.image_assets)) {
          const uploaded = await persistImageBuffer({
            buffer: Buffer.from(asset.data_base64, 'base64'),
            filename: asset.filename,
            mimetype: asset.mime_type,
          }, currentUser.id, options.env);
          imageUrlMap.set(originalUrl, new URL(uploaded.publicUrl, resolveRequestOrigin(request)).toString());
        }
      }

      const remappedSnapshot = {
        ...parsed.data,
        items: parsed.data.items.map((item) => ({
          ...item,
          images: item.images.map((imageUrl) => imageUrlMap.get(imageUrl) ?? imageUrl),
        })),
      };

      return reply.send({
        data: await importInventoryForUser(currentUser.id, remappedSnapshot),
      });
    } catch (error) {
      return reply.code(400).send({
        error: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : '导入失败',
      });
    }
  });

  app.get('/:id/ancestors', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    return reply.send({
      data: await listAncestorsForUser(currentUser.id, params.data.id),
    });
  });

  app.get('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const item = await findItemByIdForUser(currentUser.id, params.data.id);
    if (!item) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    return reply.send({
      data: item,
    });
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = createItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const parentValidation = await validateParentForUser(currentUser.id, parsed.data.parentId);
    if (parentValidation === 'not_found') {
      return reply.code(400).send({
        error: 'INVALID_PARENT',
        message: '上级位置不存在',
      });
    }

    if (parentValidation === 'not_container') {
      return reply.code(400).send({
        error: 'INVALID_PARENT',
        message: '只能放到容器类型的位置下',
      });
    }

    return reply.code(201).send({
      data: await createItemForUser(currentUser.id, parsed.data),
    });
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const parsed = updateItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    if (parsed.data.parentId === params.data.id) {
      return reply.code(400).send({
        error: 'INVALID_PARENT',
        message: '上级位置不能指向自己',
      });
    }

    const existingItem = await findItemByIdForUser(currentUser.id, params.data.id);
    if (!existingItem) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    if (parsed.data.parentId !== undefined) {
      const parentValidation = await validateParentForUser(currentUser.id, parsed.data.parentId);
      if (parentValidation === 'not_found') {
        return reply.code(400).send({
          error: 'INVALID_PARENT',
          message: '上级位置不存在',
        });
      }

      if (parentValidation === 'not_container') {
        return reply.code(400).send({
          error: 'INVALID_PARENT',
          message: '只能放到容器类型的位置下',
        });
      }

      if (parsed.data.parentId && await wouldCreateParentCycleForUser(currentUser.id, params.data.id, parsed.data.parentId)) {
        return reply.code(400).send({
          error: 'INVALID_PARENT',
          message: '上级位置不能设置为当前节点或其下级位置',
        });
      }
    }

    if (parsed.data.type === 'item' && existingItem.type === 'container' && await itemHasChildrenForUser(currentUser.id, existingItem.id)) {
      return reply.code(400).send({
        error: 'INVALID_TYPE',
        message: '仍包含内容的收纳或位置不能改为物品',
      });
    }

    const updatedItem = await updateItemForUser(currentUser.id, params.data.id, parsed.data);

    return reply.send({
      data: updatedItem,
    });
  });

  app.delete('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const deletedItem = await deleteItemForUser(currentUser.id, params.data.id);
    if (!deletedItem) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    return reply.code(204).send();
  });
};
