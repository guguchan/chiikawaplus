-- S1: Tighten RLS — require authenticated user instead of anon
-- Run this in Supabase Dashboard → SQL Editor after creating your auth account.
--
-- STEP 1: In Supabase Dashboard → Authentication → Users → Add User
--         (create your email + password)
--
-- STEP 2: Run the SQL below.

-- Drop the permissive anon-accessible policies
DROP POLICY IF EXISTS "anon_all" ON badge_themes;
DROP POLICY IF EXISTS "anon_all" ON badge_characters;
DROP POLICY IF EXISTS "anon_all" ON badge_ownership;
DROP POLICY IF EXISTS "anon_all" ON doll_characters;
DROP POLICY IF EXISTS "anon_all" ON dolls;

-- Create policies that require a valid login session
CREATE POLICY "auth_all" ON badge_themes     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON badge_characters  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON badge_ownership   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON doll_characters   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON dolls             FOR ALL TO authenticated USING (true) WITH CHECK (true);
