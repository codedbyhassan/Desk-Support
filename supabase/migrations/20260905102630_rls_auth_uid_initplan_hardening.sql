/*
  Performance hardening for RLS policies that call auth.uid() directly.

  Supabase recommends wrapping fixed auth helper calls in SELECT so Postgres can
  evaluate them once per statement instead of once per candidate row.

  This migration deliberately updates only existing policies that contain the
  exact auth.uid() expression and normalizes the common already-wrapped form
  before applying the optimized form. Policy names, roles, operations and
  authorization logic are otherwise preserved.
*/

DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%auth.uid()%' OR
        coalesce(with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    v_using := r.qual;
    v_check := r.with_check;

    /* Normalize the canonical wrapped form first, then wrap direct calls. */
    IF v_using IS NOT NULL THEN
      v_using := replace(v_using, '(select auth.uid())', 'auth.uid()');
      v_using := replace(v_using, 'auth.uid()', '(select auth.uid())');
    END IF;

    IF v_check IS NOT NULL THEN
      v_check := replace(v_check, '(select auth.uid())', 'auth.uid()');
      v_check := replace(v_check, 'auth.uid()', '(select auth.uid())');
    END IF;

    IF v_using IS NOT NULL AND v_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, v_using, v_check
      );
    ELSIF v_using IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        r.policyname, r.schemaname, r.tablename, v_using
      );
    ELSIF v_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, v_check
      );
    END IF;
  END LOOP;
END $$;