/*
  # Fix RLS Performance and Security Issues

  ## Changes

  1. RLS Policy Optimization (items table)
     - Replace `auth.uid()` with `(select auth.uid())` in all 4 policies
     - This causes auth function to be evaluated once per query instead of once per row
     - Significantly improves query performance at scale

  2. RLS Policy Optimization (categories table)
     - Same optimization applied to all 4 policies

  3. Remove Unused Indexes
     - Drop `idx_items_type`, `idx_items_status`, `idx_items_name_search`
     - These indexes are not being used and waste storage/write performance

  4. Fix Function Search Path
     - Set explicit search_path on `update_updated_at_column` to prevent mutable search path vulnerability
*/

-- Fix items table RLS policies
DROP POLICY IF EXISTS "Users can read own items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own items" ON public.items;
DROP POLICY IF EXISTS "Users can update own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own items" ON public.items;

CREATE POLICY "Users can read own items"
  ON public.items FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own items"
  ON public.items FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Fix categories table RLS policies
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Remove unused indexes
DROP INDEX IF EXISTS public.idx_items_type;
DROP INDEX IF EXISTS public.idx_items_status;
DROP INDEX IF EXISTS public.idx_items_name_search;

-- Fix mutable search_path on trigger function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
