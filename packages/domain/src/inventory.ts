export type ItemType = 'container' | 'item';
export type CategoryScope = 'location' | 'container' | 'item';
export type ItemStatus = 'in_stock' | 'borrowed' | 'worn_out';
export type TrackingMode = 'unique' | 'quantity' | 'consumable';
export type HouseholdRole = 'owner' | 'editor' | 'viewer';
export type StocktakeStatus = 'in_progress' | 'completed' | 'cancelled';
export type StocktakeEntryStatus = 'expected' | 'found' | 'missing' | 'unexpected';
export type ReminderType = 'warranty' | 'loan' | 'maintenance' | 'stocktake';
export type ReminderStatus = 'unread' | 'read' | 'dismissed';
export type AttachmentKind = 'receipt' | 'manual' | 'warranty' | 'other';

export interface Household {
  id: string;
  name: string;
  is_personal: boolean;
  created_by_user_id: string;
  role: HouseholdRole;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string | null;
  email: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  household_id: string;
  item_type: ItemType;
  scope: CategoryScope;
  preset_key: string | null;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  household_id: string;
  parent_id: string | null;
  type: ItemType;
  name: string;
  description: string;
  category: string;
  price: number | null;
  quantity: number;
  tracking_mode: TrackingMode;
  minimum_quantity: number | null;
  expiry_date: string | null;
  purchase_date: string | null;
  warranty_date: string | null;
  status: ItemStatus;
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ItemCreateInput = Omit<Item, 'id' | 'household_id' | 'created_at' | 'updated_at'>;

export interface TagEntity {
  id: string;
  user_id: string;
  household_id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type ActivityAction =
  | 'manual_create'
  | 'ai_scan_create'
  | 'update'
  | 'delete'
  | 'move'
  | 'quantity_adjust'
  | 'code_bind'
  | 'stocktake_start'
  | 'stocktake_complete'
  | 'loan_checkout'
  | 'loan_return';

export interface ActivityLog {
  id: string;
  user_id: string;
  household_id: string;
  actor_user_id: string;
  item_id: string | null;
  item_type: ItemType;
  item_name: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InventoryCode {
  id: string;
  household_id: string;
  item_id: string | null;
  code: string;
  created_by_user_id: string;
  bound_at: string | null;
  created_at: string;
}

export interface StocktakeEntry {
  id: string;
  stocktake_id: string;
  item_id: string;
  item: Item;
  expected_parent_id: string | null;
  found_parent_id: string | null;
  expected_quantity: number;
  counted_quantity: number | null;
  status: StocktakeEntryStatus;
  updated_at: string;
}

export interface StocktakeSession {
  id: string;
  household_id: string;
  location_id: string;
  location: Item;
  status: StocktakeStatus;
  created_by_user_id: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  entries: StocktakeEntry[];
}

export interface Loan {
  id: string;
  household_id: string;
  item_id: string;
  borrower_user_id: string | null;
  borrower_name: string;
  checked_out_at: string;
  due_at: string | null;
  returned_at: string | null;
  notes: string;
  created_by_user_id: string;
}

export interface Reminder {
  id: string;
  household_id: string;
  item_id: string | null;
  loan_id: string | null;
  type: ReminderType;
  source_key: string;
  title: string;
  description: string;
  due_at: string;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  household_id: string;
  item_id: string;
  kind: AttachmentKind;
  name: string;
  file_url: string;
  mime_type: string;
  size_bytes: number;
  created_by_user_id: string;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  household_id: string;
  item_id: string;
  title: string;
  notes: string;
  cost: number | null;
  provider: string | null;
  performed_at: string;
  next_due_at: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface InventoryBatch {
  id: string;
  household_id: string;
  item_id: string;
  quantity: number;
  expiry_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'household_id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Item, 'id' | 'user_id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'household_id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>;
      };
      tags: {
        Row: TagEntity;
        Insert: Omit<TagEntity, 'id' | 'household_id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TagEntity, 'id' | 'user_id' | 'created_at'>>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ActivityLog, 'id' | 'user_id' | 'created_at'>>;
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
  household_id?: string;
  parent_id: string | null;
  parent_name: string | null;
  path: string;
  type: ItemType;
  name: string;
  description: string;
  category: string;
  quantity: number;
  tracking_mode?: TrackingMode;
  minimum_quantity?: number | null;
  expiry_date?: string | null;
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
  version: '1' | '2' | '3' | '4';
  exported_at: string;
  user: {
    id: string;
    email: string;
    display_name: string | null;
  };
  categories: Category[];
  tags: TagEntity[];
  items: InventoryExportItemRecord[];
  household?: Pick<Household, 'id' | 'name'>;
  inventory_codes?: InventoryCode[];
  stocktakes?: StocktakeSession[];
  loans?: Loan[];
  reminders?: Reminder[];
  attachments?: Attachment[];
  maintenance_records?: MaintenanceRecord[];
  inventory_batches?: InventoryBatch[];
  image_assets?: Record<string, {
    filename: string;
    mime_type: string;
    data_base64: string;
  }>;
}
