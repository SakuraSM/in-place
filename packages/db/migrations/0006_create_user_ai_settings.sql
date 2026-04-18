create table if not exists user_ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  api_key_encrypted text,
  base_url varchar(255),
  model varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_ai_settings_user_id_idx on user_ai_settings(user_id);
