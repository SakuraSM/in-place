export type ItemType = 'container' | 'item';
export type ItemStatus = 'in_stock' | 'borrowed' | 'worn_out';

export interface Category {
  id: string;
  user_id: string;
  item_type: ItemType;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  parent_id: string | null;
  type: ItemType;
  name: string;
  description: string;
  category: string;
  price: number | null;
  purchase_date: string | null;
  warranty_date: string | null;
  status: ItemStatus;
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TagEntity {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Item, 'id' | 'user_id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>;
      };
      tags: {
        Row: TagEntity;
        Insert: Omit<TagEntity, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TagEntity, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ItemStats {
  total: number;
  containers: number;
  items: number;
  borrowed: number;
}

export type InventoryExportFormat = 'json' | 'csv';

export interface InventoryExportItemRecord {
  id: string;
  user_id: string;
  parent_id: string | null;
  parent_name: string | null;
  path: string;
  type: ItemType;
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number | null;
  purchase_date: string | null;
  warranty_date: string | null;
  status: ItemStatus;
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InventoryExportSnapshot {
  version: '1' | '2';
  exported_at: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
  };
  categories: Category[];
  tags: TagEntity[];
  items: InventoryExportItemRecord[];
  image_assets?: Record<string, {
    filename: string;
    mime_type: string;
    data_base64: string;
  }>;
}
