CREATE TABLE IF NOT EXISTS "mcp_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "membership_id" uuid NOT NULL REFERENCES "household_members"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "name" varchar(80) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "token_prefix" varchar(20) NOT NULL,
  "scopes" jsonb NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "last_used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "mcp_credentials_scopes_check" CHECK (
    jsonb_typeof(scopes) = 'array'
    AND scopes @> '["inventory:read"]'::jsonb
    AND scopes <@ '["inventory:read", "inventory:import"]'::jsonb
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_credentials_token_hash_idx" ON "mcp_credentials" ("token_hash");
CREATE INDEX IF NOT EXISTS "mcp_credentials_owner_idx" ON "mcp_credentials" ("user_id", "household_id");

CREATE TABLE IF NOT EXISTS "mcp_import_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "credential_id" uuid NOT NULL REFERENCES "mcp_credentials"("id") ON DELETE CASCADE,
  "request_key" varchar(100) NOT NULL,
  "payload_hash" varchar(64) NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_import_requests_key_idx" ON "mcp_import_requests" ("credential_id", "request_key");
