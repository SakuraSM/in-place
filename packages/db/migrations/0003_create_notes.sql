create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title varchar(160) not null,
  content text not null default '',
  color varchar(40) not null default 'sky',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on notes(user_id);
create index if not exists notes_user_pinned_idx on notes(user_id, pinned);
