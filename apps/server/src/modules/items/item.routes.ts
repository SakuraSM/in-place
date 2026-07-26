import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { resolveRequestOrigin } from '../../lib/request-origin.js';
import {
  createItemSchema,
  exportItemsQuerySchema,
  importInventorySchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  mergeItemsSchema,
  updateItemSchema,
} from './item.schemas.js';
import {
  createItemForHousehold,
  deleteItemForHousehold,
  exportInventoryForHousehold,
  findItemByIdForHousehold,
  getItemStatsForHousehold,
  importInventoryForHousehold,
  itemHasChildrenForHousehold,
  listAncestorsForHousehold,
  listItemsForHousehold,
  mergeItemsForHousehold,
  updateItemForHousehold,
  validateParentForHousehold,
  wouldCreateParentCycleForHousehold,
} from './item.repository.js';
import { createActivityLogForHousehold } from '../activity/activity.repository.js';
import type { AppEnv } from '../../env.js';
import { persistImageBuffer, resolveImageMimeType, resolveUploadRoot } from '../../lib/uploads.js';
import type { CreateItemInput, UpdateItemInput } from './item.schemas.js';

interface ExportCategoryRecord {
  id: string;
  user_id: string;
  item_type: 'container' | 'item';
  scope: 'location' | 'container' | 'item';
  preset_key: string | null;
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
  tracking_mode: 'unique' | 'quantity' | 'consumable';
  minimum_quantity: number | null;
  expiry_date: string | null;
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
  version: '1' | '2' | '3' | '4';
  exported_at: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
  };
  categories: ExportCategoryRecord[];
  tags: ExportTagRecord[];
  items: ExportItemRecord[];
  household?: unknown;
  codes?: unknown[];
  stocktakes?: unknown[];
  stocktake_entries?: unknown[];
  loans?: unknown[];
  reminders?: unknown[];
  attachments?: unknown[];
  maintenance_records?: unknown[];
  inventory_batches?: unknown[];
  activity?: unknown[];
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

function toExportItemRecords(rows: Awaited<ReturnType<typeof exportInventoryForHousehold>>['items']): ExportItemRecord[] {
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
    tracking_mode: row.trackingMode,
    minimum_quantity: row.minimumQuantity,
    expiry_date: row.expiryDate,
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

function toExportCategories(rows: Awaited<ReturnType<typeof exportInventoryForHousehold>>['categories']): ExportCategoryRecord[] {
  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    item_type: row.itemType,
    scope: row.scope,
    preset_key: row.presetKey,
    name: row.name,
    icon: row.icon,
    color: row.color,
    created_at: row.createdAt.toISOString(),
  }));
}

function toExportTags(rows: Awaited<ReturnType<typeof exportInventoryForHousehold>>['tags']): ExportTagRecord[] {
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
    'tracking_mode',
    'minimum_quantity',
    'expiry_date',
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
    item.tracking_mode,
    item.minimum_quantity,
    item.expiry_date,
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

function isAiScanCreate(input: CreateItemInput) {
  return input.metadata?.ai_recognized === true || input.metadata?.source_image === 'scan';
}

function listChangedFields(existingItem: Awaited<ReturnType<typeof findItemByIdForHousehold>>, input: UpdateItemInput) {
  if (!existingItem) {
    return Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field);
  }

  const fieldMap = [
    ['parentId', existingItem.parentId],
    ['type', existingItem.type],
    ['name', existingItem.name],
    ['description', existingItem.description],
    ['category', existingItem.category],
    ['price', existingItem.price === null ? null : Number(existingItem.price)],
    ['quantity', existingItem.quantity],
    ['trackingMode', existingItem.trackingMode],
    ['minimumQuantity', existingItem.minimumQuantity],
    ['expiryDate', existingItem.expiryDate],
    ['purchaseDate', existingItem.purchaseDate],
    ['warrantyDate', existingItem.warrantyDate],
    ['status', existingItem.status],
    ['images', existingItem.images],
    ['tags', existingItem.tags],
    ['metadata', existingItem.metadata],
  ] as const satisfies ReadonlyArray<readonly [keyof UpdateItemInput, unknown]>;

  return fieldMap
    .filter(([field, previousValue]) => {
      if (input[field] === undefined) {
        return false;
      }

      return JSON.stringify(input[field]) !== JSON.stringify(previousValue);
    })
    .map(([field]) => field);
}

async function buildImageAssets(input: {
  items: ExportItemRecord[];
  attachmentUrls?: string[];
  env: AppEnv;
  origin: string;
}) {
  const uploadRoot = resolveUploadRoot(input.env);
  const assets = new Map<string, {
    filename: string;
    mime_type: string;
    data_base64: string;
  }>();

  const assetUrls = [
    ...input.items.flatMap((item) => item.images),
    ...(input.attachmentUrls ?? []),
  ];
  for (const imageUrl of assetUrls) {
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

  return Object.fromEntries(assets);
}

export const itemRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
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
      ...(await listItemsForHousehold(access.householdId, parsed.data)),
    });
  });

  app.get('/stats', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
      return;
    }

    return reply.send({
      data: await getItemStatsForHousehold(access.householdId),
    });
  });

  app.post('/merge', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const body = mergeItemsSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: body.error.issues[0]?.message });
    }
    const item = await mergeItemsForHousehold({
      householdId: access.householdId,
      ...body.data,
    });
    if (!item) {
      return reply.code(409).send({ error: 'ITEMS_NOT_MERGEABLE', message: '记录不存在、类型不一致，或重复项已有盘点/借还历史' });
    }
    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: item.id,
      itemType: item.type,
      itemName: item.name,
      action: 'update',
      metadata: { merged_item_ids: body.data.duplicateItemIds },
    });
    return reply.send({ data: item });
  });

  app.get('/export', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;

    const parsed = exportItemsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: parsed.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    const exportedAt = new Date().toISOString();
    const inventory = await exportInventoryForHousehold(access.householdId);
    const itemRecords = toExportItemRecords(inventory.items);
    const baseFilename = `inplace-inventory-${sanitizeFileTimestamp(new Date())}`;

    if (parsed.data.format === 'csv') {
      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${baseFilename}.csv"`)
        .send(buildExportCsv(itemRecords));
    }

    const payload: ExportSnapshot = {
      version: '4',
      exported_at: exportedAt,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        display_name: currentUser.displayName ?? null,
      },
      categories: toExportCategories(inventory.categories),
      tags: toExportTags(inventory.tags),
      items: itemRecords,
      household: inventory.household,
      codes: inventory.codes,
      stocktakes: inventory.stocktakes,
      stocktake_entries: inventory.stocktakeEntries,
      loans: inventory.loans,
      reminders: inventory.reminders,
      attachments: inventory.attachments,
      maintenance_records: inventory.maintenanceRecords,
      inventory_batches: inventory.inventoryBatches,
      activity: inventory.activity,
      image_assets: await buildImageAssets({
        items: itemRecords,
        attachmentUrls: inventory.attachments.map((attachment) => attachment.fileUrl),
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
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'owner' });
    if (!access) {
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
          }, access.userId, options.env);
          imageUrlMap.set(originalUrl, new URL(uploaded.publicUrl, resolveRequestOrigin(request)).toString());
        }
      }

      const remappedSnapshot = {
        ...parsed.data,
        items: parsed.data.items.map((item) => ({
          ...item,
          images: item.images.map((imageUrl) => imageUrlMap.get(imageUrl) ?? imageUrl),
        })),
        attachments: parsed.data.attachments.map((attachment) => ({
          ...attachment,
          ...(typeof attachment.fileUrl === 'string'
            ? { fileUrl: imageUrlMap.get(attachment.fileUrl) ?? attachment.fileUrl }
            : {}),
        })),
      };

      return reply.send({
        data: await importInventoryForHousehold(access, remappedSnapshot),
      });
    } catch (error) {
      return reply.code(400).send({
        error: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : '导入失败',
      });
    }
  });

  app.get('/:id/ancestors', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
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
      data: await listAncestorsForHousehold(access.householdId, params.data.id),
    });
  });

  app.get('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const item = await findItemByIdForHousehold(access.householdId, params.data.id);
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
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const parsed = createItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const parentValidation = await validateParentForHousehold(access.householdId, parsed.data.parentId);
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

    const createdItem = await createItemForHousehold(access, parsed.data);

    if (createdItem) {
      await createActivityLogForHousehold({
        userId: access.userId,
        householdId: access.householdId,
        itemId: createdItem.id,
        itemType: createdItem.type,
        itemName: createdItem.name,
        action: isAiScanCreate(parsed.data) ? 'ai_scan_create' : 'manual_create',
        metadata: {
          parent_id: createdItem.parentId,
          category: createdItem.category,
        },
      });
    }

    return reply.code(201).send({
      data: createdItem,
    });
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
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

    const existingItem = await findItemByIdForHousehold(access.householdId, params.data.id);
    if (!existingItem) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    if (parsed.data.parentId !== undefined) {
      const parentValidation = await validateParentForHousehold(access.householdId, parsed.data.parentId);
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

      if (await wouldCreateParentCycleForHousehold(access.householdId, params.data.id, parsed.data.parentId)) {
        return reply.code(400).send({
          error: 'INVALID_PARENT',
          message: '上级位置不能设置为当前节点或其下级位置',
        });
      }
    }

    if (parsed.data.type === 'item' && existingItem.type === 'container' && await itemHasChildrenForHousehold(access.householdId, existingItem.id)) {
      return reply.code(400).send({
        error: 'INVALID_TYPE',
        message: '仍包含内容的收纳或位置不能改为物品',
      });
    }

    const updatedItem = await updateItemForHousehold(access, params.data.id, parsed.data);

    if (updatedItem) {
      const action = parsed.data.parentId !== undefined && parsed.data.parentId !== existingItem.parentId
        ? 'move'
        : parsed.data.quantity !== undefined && parsed.data.quantity !== existingItem.quantity
          ? 'quantity_adjust'
          : 'update';
      await createActivityLogForHousehold({
        userId: access.userId,
        householdId: access.householdId,
        itemId: updatedItem.id,
        itemType: updatedItem.type,
        itemName: updatedItem.name,
        action,
        metadata: {
          changed_fields: listChangedFields(existingItem, parsed.data),
        },
      });
    }

    return reply.send({
      data: updatedItem,
    });
  });

  app.delete('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const params = itemIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const existingItem = await findItemByIdForHousehold(access.householdId, params.data.id);
    if (!existingItem) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    const deletedItem = await deleteItemForHousehold(access.householdId, params.data.id);
    if (!deletedItem) {
      return reply.code(404).send({
        error: 'ITEM_NOT_FOUND',
        message: '物品不存在',
      });
    }

    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: existingItem.id,
      itemType: existingItem.type,
      itemName: existingItem.name,
      action: 'delete',
      metadata: {
        parent_id: existingItem.parentId,
        category: existingItem.category,
      },
    });

    return reply.code(204).send();
  });
};
