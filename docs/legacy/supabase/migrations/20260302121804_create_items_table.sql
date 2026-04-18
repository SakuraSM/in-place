/*
  # Create Items and Containers Table

  ## Summary
  Creates the core data structure for the home inventory management app.
  Uses a single self-referencing table to support unlimited nesting of
  containers and items.

  ## New Tables
  - `items`: Unified table for both containers (rooms, boxes, drawers) and items
    - `id` (uuid, PK): Unique identifier
    - `user_id` (uuid, FK -> auth.users): Owner of the item
    - `parent_id` (uuid, FK -> items.id, nullable): Parent container (null = root level)
    - `type` (text): 'container' or 'item'
    - `name` (text): Display name
    - `description` (text): Optional description
    - `category` (text): Category classification
    - `price` (numeric, nullable): Purchase price
    - `purchase_date` (date, nullable): When it was purchased
    - `warranty_date` (date, nullable): Warranty expiry date
    - `status` (text): 'in_stock', 'borrowed', 'worn_out'
    - `images` (text[]): Array of image URLs
    - `tags` (text[]): Searchable tags
    - `metadata` (jsonb): Flexible metadata, AI recognition results
    - `created_at` (timestamptz): Creation timestamp
    - `updated_at` (timestamptz): Last update timestamp

  ## Indexes
  - `idx_items_user_id`: Fast lookup by user
  - `idx_items_parent_id`: Fast lookup of children by parent
  - `idx_items_type`: Filter by type
  - `idx_items_status`: Filter by status
  - `idx_items_name_search`: Full text search on name

  ## Security
  - RLS enabled: users can only access their own items
  - SELECT policy: users can read their own items
  - INSERT policy: users can insert items owned by themselves
  - UPDATE policy: users can update their own items
  - DELETE policy: users can delete their own items

  ## Trigger
  - `update_items_updated_at`: Auto-updates `updated_at` on every row change
*/

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES items(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'item' CHECK (type IN ('container', 'item')),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  price numeric,
  purchase_date date,
  warranty_date date,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'borrowed', 'worn_out')),
  images text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_name_search ON items USING gin(to_tsvector('english', name));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own items"
  ON items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
