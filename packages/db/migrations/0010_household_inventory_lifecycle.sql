alter type activity_action add value if not exists 'move';
alter type activity_action add value if not exists 'quantity_adjust';
alter type activity_action add value if not exists 'code_bind';
alter type activity_action add value if not exists 'stocktake_start';
alter type activity_action add value if not exists 'stocktake_complete';
alter type activity_action add value if not exists 'loan_checkout';
alter type activity_action add value if not exists 'loan_return';

create type household_role as enum ('owner', 'editor', 'viewer');
create type stocktake_status as enum ('in_progress', 'completed', 'cancelled');
create type stocktake_entry_status as enum ('expected', 'found', 'missing', 'unexpected');
create type tracking_mode as enum ('unique', 'quantity', 'consumable');
create type reminder_type as enum ('warranty', 'loan', 'maintenance', 'stocktake');
create type reminder_status as enum ('unread', 'read', 'dismissed');
create type attachment_kind as enum ('receipt', 'manual', 'warranty', 'other');

create table households (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  is_personal boolean not null default false,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index households_creator_idx on households(created_by_user_id);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role household_role not null default 'viewer',
  joined_at timestamptz not null default now()
);

create index household_members_household_idx on household_members(household_id);
create index household_members_user_idx on household_members(user_id);
create unique index household_members_membership_idx on household_members(household_id, user_id);

create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token_hash varchar(64) not null,
  role household_role not null default 'viewer',
  created_by_user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index household_invites_token_idx on household_invites(token_hash);
create index household_invites_household_idx on household_invites(household_id);

insert into households (id, name, is_personal, created_by_user_id, created_at, updated_at)
select gen_random_uuid(), coalesce(nullif(display_name, ''), split_part(email, '@', 1)) || '的家庭', true, id, created_at, updated_at
from users;

insert into household_members (household_id, user_id, role, joined_at)
select id, created_by_user_id, 'owner', created_at
from households
where is_personal = true;

alter table categories add column household_id uuid references households(id) on delete cascade;
alter table deleted_category_presets add column household_id uuid references households(id) on delete cascade;
alter table items add column household_id uuid references households(id) on delete cascade;
alter table tags add column household_id uuid references households(id) on delete cascade;
alter table activity_logs
  add column household_id uuid references households(id) on delete cascade,
  add column actor_user_id uuid references users(id) on delete cascade;

update categories record
set household_id = household.id
from households household
where household.created_by_user_id = record.user_id and household.is_personal = true;

update deleted_category_presets record
set household_id = household.id
from households household
where household.created_by_user_id = record.user_id and household.is_personal = true;

update items record
set household_id = household.id
from households household
where household.created_by_user_id = record.user_id and household.is_personal = true;

update tags record
set household_id = household.id
from households household
where household.created_by_user_id = record.user_id and household.is_personal = true;

update activity_logs record
set household_id = household.id, actor_user_id = record.user_id
from households household
where household.created_by_user_id = record.user_id and household.is_personal = true;

alter table categories alter column household_id set not null;
alter table deleted_category_presets alter column household_id set not null;
alter table items alter column household_id set not null;
alter table tags alter column household_id set not null;
alter table activity_logs alter column household_id set not null;
alter table activity_logs alter column actor_user_id set not null;

create index categories_household_id_idx on categories(household_id);
create unique index categories_household_preset_idx on categories(household_id, preset_key) where preset_key is not null;
create index deleted_category_presets_household_id_idx on deleted_category_presets(household_id);
create unique index deleted_category_presets_household_preset_idx on deleted_category_presets(household_id, preset_key);
create index items_household_id_idx on items(household_id);
create index tags_household_id_idx on tags(household_id);
create unique index tags_household_name_idx on tags(household_id, name);
create index activity_logs_household_id_idx on activity_logs(household_id);

alter table items
  add column tracking_mode tracking_mode not null default 'unique',
  add column minimum_quantity integer,
  add column expiry_date date;

create table inventory_codes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid references items(id) on delete set null,
  code varchar(64) not null,
  created_by_user_id uuid not null references users(id) on delete cascade,
  bound_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index inventory_codes_code_idx on inventory_codes(code);
create index inventory_codes_household_idx on inventory_codes(household_id);
create unique index inventory_codes_item_idx on inventory_codes(item_id) where item_id is not null;

create table stocktakes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  location_id uuid not null references items(id) on delete restrict,
  status stocktake_status not null default 'in_progress',
  created_by_user_id uuid not null references users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stocktakes_household_idx on stocktakes(household_id);
create index stocktakes_location_idx on stocktakes(location_id);

create table stocktake_entries (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references stocktakes(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  expected_parent_id uuid references items(id) on delete set null,
  found_parent_id uuid references items(id) on delete set null,
  expected_quantity integer not null default 1,
  counted_quantity integer,
  status stocktake_entry_status not null default 'expected',
  updated_at timestamptz not null default now()
);

create index stocktake_entries_stocktake_idx on stocktake_entries(stocktake_id);
create index stocktake_entries_item_idx on stocktake_entries(item_id);
create unique index stocktake_entries_unique_idx on stocktake_entries(stocktake_id, item_id);

create table loans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid not null references items(id) on delete restrict,
  borrower_user_id uuid references users(id) on delete set null,
  borrower_name varchar(120) not null,
  checked_out_at timestamptz not null default now(),
  due_at timestamptz,
  returned_at timestamptz,
  notes text not null default '',
  created_by_user_id uuid not null references users(id) on delete restrict
);

create index loans_household_idx on loans(household_id);
create index loans_item_idx on loans(item_id);
create unique index loans_active_item_idx on loans(item_id) where returned_at is null;

create table reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  loan_id uuid references loans(id) on delete cascade,
  type reminder_type not null,
  source_key varchar(200) not null,
  title varchar(160) not null,
  description text not null default '',
  due_at timestamptz not null,
  status reminder_status not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_household_idx on reminders(household_id);
create index reminders_due_idx on reminders(household_id, due_at);
create unique index reminders_source_idx on reminders(household_id, source_key);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  kind attachment_kind not null default 'other',
  name varchar(255) not null,
  file_url text not null,
  mime_type varchar(120) not null,
  size_bytes bigint not null,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index attachments_item_idx on attachments(item_id);
create index attachments_household_idx on attachments(household_id);

create table maintenance_records (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  title varchar(160) not null,
  notes text not null default '',
  cost numeric(12, 2),
  provider varchar(160),
  performed_at timestamptz not null,
  next_due_at timestamptz,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index maintenance_records_item_idx on maintenance_records(item_id);
create index maintenance_records_household_idx on maintenance_records(household_id);

create table inventory_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expiry_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_batches_item_idx on inventory_batches(item_id);
create index inventory_batches_household_idx on inventory_batches(household_id);
