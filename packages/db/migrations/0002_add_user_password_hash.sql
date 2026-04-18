alter table users
add column if not exists password_hash varchar(255);

update users
set password_hash = '__legacy_user_requires_reset__'
where password_hash is null;

alter table users
alter column password_hash set not null;
