/*
  # Create categories table

  ## Summary
  Adds a `categories` table allowing users to define custom categories for containers and items.

  ## New Tables
  - `categories`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to auth.users)
    - `item_type` (text) - either 'container' or 'item', determines which type this category applies to
    - `name` (text) - display name of the category
    - `icon` (text) - lucide icon name string
    - `color` (text) - tailwind color key (e.g. 'sky', 'teal', 'amber', etc.)
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on `categories` table
  - Authenticated users can SELECT, INSERT, UPDATE, DELETE their own categories
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'item' CHECK (item_type IN ('container', 'item')),
  name text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Tag',
  color text NOT NULL DEFAULT 'slate',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS categories_item_type_idx ON categories(item_type);
