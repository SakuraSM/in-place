-- Before household-scoped tags were introduced, (user_id, name) only had a
-- non-unique index. Keep the most useful definition for each duplicated name
-- so migration 0010 can safely add the household-level unique constraint.
--
-- This migration is also safe for databases that already applied 0010: user_id
-- remains available and the household unique constraint guarantees this is a
-- no-op there.
with ranked_tags as (
  select
    id,
    row_number() over (
      partition by user_id, name
      order by
        (description <> '') desc,
        (color <> 'sky') desc,
        updated_at desc,
        created_at asc,
        id asc
    ) as duplicate_rank
  from tags
)
delete from tags record
using ranked_tags ranked
where record.id = ranked.id
  and ranked.duplicate_rank > 1;
