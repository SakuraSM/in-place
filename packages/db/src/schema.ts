import { type AnyPgColumn, bigint, boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const itemTypeEnum = pgEnum('item_type', ['container', 'item']);
export const categoryScopeEnum = pgEnum('category_scope', ['location', 'container', 'item']);
export const itemStatusEnum = pgEnum('item_status', ['in_stock', 'borrowed', 'worn_out']);
export const activityActionEnum = pgEnum('activity_action', [
  'manual_create',
  'ai_scan_create',
  'update',
  'delete',
  'move',
  'quantity_adjust',
  'code_bind',
  'stocktake_start',
  'stocktake_complete',
  'loan_checkout',
  'loan_return',
]);
export const householdRoleEnum = pgEnum('household_role', ['owner', 'editor', 'viewer']);
export const stocktakeStatusEnum = pgEnum('stocktake_status', ['in_progress', 'completed', 'cancelled']);
export const stocktakeEntryStatusEnum = pgEnum('stocktake_entry_status', ['expected', 'found', 'missing', 'unexpected']);
export const trackingModeEnum = pgEnum('tracking_mode', ['unique', 'quantity', 'consumable']);
export const reminderTypeEnum = pgEnum('reminder_type', ['warranty', 'loan', 'maintenance', 'stocktake']);
export const reminderStatusEnum = pgEnum('reminder_status', ['unread', 'read', 'dismissed']);
export const attachmentKindEnum = pgEnum('attachment_kind', ['receipt', 'manual', 'warranty', 'other']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  isPersonal: boolean('is_personal').notNull().default(false),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('households_creator_idx').on(table.createdByUserId),
}));

export const householdMembers = pgTable('household_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: householdRoleEnum('role').notNull().default('viewer'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdIdx: index('household_members_household_idx').on(table.householdId),
  userIdx: index('household_members_user_idx').on(table.userId),
  membershipIdx: uniqueIndex('household_members_membership_idx').on(table.householdId, table.userId),
}));

export const householdInvites = pgTable('household_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  role: householdRoleEnum('role').notNull().default('viewer'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('household_invites_token_idx').on(table.tokenHash),
  householdIdx: index('household_invites_household_idx').on(table.householdId),
}));

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemType: itemTypeEnum('item_type').notNull().default('item'),
  scope: categoryScopeEnum('scope').notNull().default('item'),
  presetKey: varchar('preset_key', { length: 120 }),
  name: varchar('name', { length: 120 }).notNull(),
  icon: varchar('icon', { length: 255 }).notNull().default('FolderTree'),
  color: varchar('color', { length: 40 }).notNull().default('slate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('categories_user_id_idx').on(table.userId),
  householdIdx: index('categories_household_id_idx').on(table.householdId),
  userTypeIdx: index('categories_user_type_idx').on(table.userId, table.itemType),
  userScopeIdx: index('categories_user_scope_idx').on(table.userId, table.scope),
  householdPresetIdx: uniqueIndex('categories_household_preset_idx').on(table.householdId, table.presetKey),
}));

export const deletedCategoryPresets = pgTable('deleted_category_presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  presetKey: varchar('preset_key', { length: 120 }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdPresetIdx: uniqueIndex('deleted_category_presets_household_preset_idx').on(table.householdId, table.presetKey),
}));

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => items.id, { onDelete: 'cascade' }),
  type: itemTypeEnum('type').notNull().default('item'),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description').notNull().default(''),
  category: varchar('category', { length: 120 }).notNull().default(''),
  price: numeric('price', { precision: 12, scale: 2 }),
  quantity: integer('quantity').notNull().default(1),
  trackingMode: trackingModeEnum('tracking_mode').notNull().default('unique'),
  minimumQuantity: integer('minimum_quantity'),
  expiryDate: date('expiry_date'),
  purchaseDate: date('purchase_date'),
  warrantyDate: date('warranty_date'),
  status: itemStatusEnum('status').notNull().default('in_stock'),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('items_user_id_idx').on(table.userId),
  householdIdx: index('items_household_id_idx').on(table.householdId),
  parentIdx: index('items_parent_id_idx').on(table.parentId),
  userParentIdx: index('items_user_parent_idx').on(table.userId, table.parentId),
  userTypeIdx: index('items_user_type_idx').on(table.userId, table.type),
}));

export const tagRegistry = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  description: text('description').notNull().default(''),
  color: varchar('color', { length: 40 }).notNull().default('sky'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('tags_user_id_idx').on(table.userId),
  householdIdx: index('tags_household_id_idx').on(table.householdId),
  userNameIdx: index('tags_user_name_idx').on(table.userId, table.name),
  householdNameIdx: uniqueIndex('tags_household_name_idx').on(table.householdId, table.name),
}));

export const userAiSettings = pgTable('user_ai_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: varchar('base_url', { length: 255 }),
  model: varchar('model', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex('user_ai_settings_user_id_idx').on(table.userId),
}));

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id'),
  itemType: itemTypeEnum('item_type').notNull(),
  itemName: varchar('item_name', { length: 160 }).notNull(),
  action: activityActionEnum('action').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('activity_logs_user_id_idx').on(table.userId),
  householdIdx: index('activity_logs_household_id_idx').on(table.householdId),
  userCreatedIdx: index('activity_logs_user_created_at_idx').on(table.userId, table.createdAt),
  itemIdx: index('activity_logs_item_id_idx').on(table.itemId),
}));

export const inventoryCodes = pgTable('inventory_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
  code: varchar('code', { length: 64 }).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  boundAt: timestamp('bound_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('inventory_codes_code_idx').on(table.code),
  householdIdx: index('inventory_codes_household_idx').on(table.householdId),
  itemIdx: uniqueIndex('inventory_codes_item_idx').on(table.itemId),
}));

export const stocktakes = pgTable('stocktakes', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  locationId: uuid('location_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  status: stocktakeStatusEnum('status').notNull().default('in_progress'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdIdx: index('stocktakes_household_idx').on(table.householdId),
  locationIdx: index('stocktakes_location_idx').on(table.locationId),
}));

export const stocktakeEntries = pgTable('stocktake_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  stocktakeId: uuid('stocktake_id').notNull().references(() => stocktakes.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  expectedParentId: uuid('expected_parent_id').references(() => items.id, { onDelete: 'set null' }),
  foundParentId: uuid('found_parent_id').references(() => items.id, { onDelete: 'set null' }),
  expectedQuantity: integer('expected_quantity').notNull().default(1),
  countedQuantity: integer('counted_quantity'),
  status: stocktakeEntryStatusEnum('status').notNull().default('expected'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  stocktakeIdx: index('stocktake_entries_stocktake_idx').on(table.stocktakeId),
  itemIdx: index('stocktake_entries_item_idx').on(table.itemId),
  uniqueEntryIdx: uniqueIndex('stocktake_entries_unique_idx').on(table.stocktakeId, table.itemId),
}));

export const loans = pgTable('loans', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  borrowerUserId: uuid('borrower_user_id').references(() => users.id, { onDelete: 'set null' }),
  borrowerName: varchar('borrower_name', { length: 120 }).notNull(),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }).defaultNow().notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  notes: text('notes').notNull().default(''),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
}, (table) => ({
  householdIdx: index('loans_household_idx').on(table.householdId),
  itemIdx: index('loans_item_idx').on(table.itemId),
}));

export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }),
  loanId: uuid('loan_id').references(() => loans.id, { onDelete: 'cascade' }),
  type: reminderTypeEnum('type').notNull(),
  sourceKey: varchar('source_key', { length: 200 }).notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  description: text('description').notNull().default(''),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  status: reminderStatusEnum('status').notNull().default('unread'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  householdIdx: index('reminders_household_idx').on(table.householdId),
  dueIdx: index('reminders_due_idx').on(table.householdId, table.dueAt),
  sourceIdx: uniqueIndex('reminders_source_idx').on(table.householdId, table.sourceKey),
}));

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  kind: attachmentKindEnum('kind').notNull().default('other'),
  name: varchar('name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  itemIdx: index('attachments_item_idx').on(table.itemId),
  householdIdx: index('attachments_household_idx').on(table.householdId),
}));

export const maintenanceRecords = pgTable('maintenance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 160 }).notNull(),
  notes: text('notes').notNull().default(''),
  cost: numeric('cost', { precision: 12, scale: 2 }),
  provider: varchar('provider', { length: 160 }),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  nextDueAt: timestamp('next_due_at', { withTimezone: true }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  itemIdx: index('maintenance_records_item_idx').on(table.itemId),
  householdIdx: index('maintenance_records_household_idx').on(table.householdId),
}));

export const inventoryBatches = pgTable('inventory_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  expiryDate: date('expiry_date'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  itemIdx: index('inventory_batches_item_idx').on(table.itemId),
  householdIdx: index('inventory_batches_household_idx').on(table.householdId),
}));

export type User = typeof users.$inferSelect;
export type Household = typeof households.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type HouseholdInvite = typeof householdInvites.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type DeletedCategoryPreset = typeof deletedCategoryPresets.$inferSelect;
export type Item = typeof items.$inferSelect;
export type TagRecord = typeof tagRegistry.$inferSelect;
export type UserAiSetting = typeof userAiSettings.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InventoryCode = typeof inventoryCodes.$inferSelect;
export type Stocktake = typeof stocktakes.$inferSelect;
export type StocktakeEntry = typeof stocktakeEntries.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InventoryBatch = typeof inventoryBatches.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewDeletedCategoryPreset = typeof deletedCategoryPresets.$inferInsert;
export type NewItem = typeof items.$inferInsert;
export type NewTagRecord = typeof tagRegistry.$inferInsert;
export type NewUserAiSetting = typeof userAiSettings.$inferInsert;
export type NewActivityLog = typeof activityLogs.$inferInsert;
