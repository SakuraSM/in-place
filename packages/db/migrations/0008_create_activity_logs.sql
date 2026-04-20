DO $$ BEGIN
  CREATE TYPE "activity_action" AS ENUM ('manual_create', 'ai_scan_create', 'update', 'delete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_id" uuid,
  "item_type" "item_type" NOT NULL,
  "item_name" varchar(160) NOT NULL,
  "action" "activity_action" NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_user_created_at_idx" ON "activity_logs" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_item_id_idx" ON "activity_logs" ("item_id");
