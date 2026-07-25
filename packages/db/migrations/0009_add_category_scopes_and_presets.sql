create type category_scope as enum ('location', 'container', 'item');

alter table categories
  add column scope category_scope,
  add column preset_key varchar(120);

update categories
set scope = case
  when item_type = 'item' then 'item'::category_scope
  else 'container'::category_scope
end;

-- Existing container categories used only by locations become location categories.
update categories c
set scope = 'location'
where c.item_type = 'container'
  and exists (
    select 1
    from items i
    where i.user_id = c.user_id
      and i.type = 'container'
      and i.category = c.name
      and i.metadata ->> 'location_tag' = 'true'
  )
  and not exists (
    select 1
    from items i
    where i.user_id = c.user_id
      and i.type = 'container'
      and i.category = c.name
      and coalesce(i.metadata ->> 'location_tag', 'false') <> 'true'
  );

-- A category used by both locations and storage is copied so both scopes retain it.
insert into categories (id, user_id, item_type, scope, name, icon, color, created_at)
select gen_random_uuid(), c.user_id, 'container', 'location', c.name, c.icon, c.color, c.created_at
from categories c
where c.item_type = 'container'
  and c.scope = 'container'
  and exists (
    select 1
    from items i
    where i.user_id = c.user_id
      and i.type = 'container'
      and i.category = c.name
      and i.metadata ->> 'location_tag' = 'true'
  )
  and exists (
    select 1
    from items i
    where i.user_id = c.user_id
      and i.type = 'container'
      and i.category = c.name
      and coalesce(i.metadata ->> 'location_tag', 'false') <> 'true'
  );

alter table categories
  alter column scope set not null,
  alter column scope set default 'item';

create index categories_user_scope_idx on categories(user_id, scope);
create unique index categories_user_preset_idx
  on categories(user_id, preset_key)
  where preset_key is not null;

create table deleted_category_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  preset_key varchar(120) not null,
  deleted_at timestamptz not null default now()
);

create unique index deleted_category_presets_user_preset_idx
  on deleted_category_presets(user_id, preset_key);
