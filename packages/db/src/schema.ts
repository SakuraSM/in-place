import { type AnyPgColumn, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const itemTypeEnum = pgEnum('item_type', ['container', 'item']);
export const itemStatusEnum = pgEnum('item_status', ['in_stock', 'borrowed', 'worn_out']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemType: itemTypeEnum('item_type').notNull().default('item'),
  name: varchar('name', { length: 120 }).notNull(),
  icon: varchar('icon', { length: 255 }).notNull().default('FolderTree'),
  color: varchar('color', { length: 40 }).notNull().default('slate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('categories_user_id_idx').on(table.userId),
  userTypeIdx: index('categories_user_type_idx').on(table.userId, table.itemType),
}));

export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => items.id, { onDelete: 'cascade' }),
  type: itemTypeEnum('type').notNull().default('item'),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description').notNull().default(''),
  category: varchar('category', { length: 120 }).notNull().default(''),
  price: numeric('price', { precision: 12, scale: 2 }),
  quantity: integer('quantity').notNull().default(1),
  purchaseDate: timestamp('purchase_date', { mode: 'date' }),
  warrantyDate: timestamp('warranty_date', { mode: 'date' }),
  status: itemStatusEnum('status').notNull().default('in_stock'),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('items_user_id_idx').on(table.userId),
  parentIdx: index('items_parent_id_idx').on(table.parentId),
  userParentIdx: index('items_user_parent_idx').on(table.userId, table.parentId),
  userTypeIdx: index('items_user_type_idx').on(table.userId, table.type),
}));

export const tagRegistry = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  description: text('description').notNull().default(''),
  color: varchar('color', { length: 40 }).notNull().default('sky'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('tags_user_id_idx').on(table.userId),
  userNameIdx: index('tags_user_name_idx').on(table.userId, table.name),
}));

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type TagRecord = typeof tagRegistry.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewItem = typeof items.$inferInsert;
export type NewTagRecord = typeof tagRegistry.$inferInsert;
