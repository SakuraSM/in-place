create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  display_name varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type item_type as enum ('container', 'item');
create type item_status as enum ('in_stock', 'borrowed', 'worn_out');

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  item_type item_type not null default 'item',
  name varchar(120) not null,
  icon varchar(80) not null default 'Tag',
  color varchar(40) not null default 'slate',
  created_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on categories(user_id);
create index if not exists categories_user_type_idx on categories(user_id, item_type);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  parent_id uuid references items(id) on delete cascade,
  type item_type not null default 'item',
  name varchar(160) not null,
  description text not null default '',
  category varchar(120) not null default '',
  price numeric(12, 2),
  quantity integer not null default 1,
  purchase_date date,
  warranty_date date,
  status item_status not null default 'in_stock',
  images jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on items(user_id);
create index if not exists items_parent_id_idx on items(parent_id);
create index if not exists items_user_parent_idx on items(user_id, parent_id);
create index if not exists items_user_type_idx on items(user_id, type);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
before update on items
for each row
execute function set_updated_at();

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row
execute function set_updated_at();
