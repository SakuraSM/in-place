create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name varchar(80) not null,
  description text not null default '',
  color varchar(40) not null default 'sky',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tags_user_id_idx on tags(user_id);
create index if not exists tags_user_name_idx on tags(user_id, name);
