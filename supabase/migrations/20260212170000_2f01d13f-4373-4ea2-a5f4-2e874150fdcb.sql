-- Migration: Enable multi-account Monday.com support on user_integrations
-- This migration allows a user to have multiple Monday.com integrations (one per account)
-- by changing the UNIQUE constraint from (user_id, integration_type) to
-- (user_id, integration_type, monday_account_id).

-- ============================================================
-- Step 1: Backfill NULL monday_account_id values
-- ============================================================
-- Log rows with NULL monday_account_id before backfilling
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.user_integrations
  WHERE monday_account_id IS NULL;

  IF null_count > 0 THEN
    RAISE NOTICE 'Found % row(s) with NULL monday_account_id — backfilling with ''unknown''', null_count;
  ELSE
    RAISE NOTICE 'No rows with NULL monday_account_id — no backfill needed';
  END IF;
END $$;

UPDATE public.user_integrations
SET monday_account_id = 'unknown'
WHERE monday_account_id IS NULL;

-- ============================================================
-- Step 2: Drop the old UNIQUE constraint (user_id, integration_type)
-- ============================================================
ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_user_id_integration_type_key;

-- ============================================================
-- Step 3: Add new UNIQUE constraint (user_id, integration_type, monday_account_id)
-- ============================================================
ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_user_account_unique
  UNIQUE(user_id, integration_type, monday_account_id);

-- ============================================================
-- Step 4: Make monday_account_id NOT NULL
-- ============================================================
ALTER TABLE public.user_integrations
  ALTER COLUMN monday_account_id SET NOT NULL;

-- ============================================================
-- Step 5: Add account_name column
-- ============================================================
-- The existing workspace_name column stores the Monday.com workspace name.
-- Adding a separate account_name column to store the Monday.com account name
-- (e.g., "Thewowstudio") which is distinct from workspace names within an account.
-- This is important for multi-account support so users can identify which account
-- each integration belongs to.
ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS account_name TEXT;

COMMENT ON COLUMN public.user_integrations.account_name IS
  'Monday.com account name (e.g., "Thewowstudio") for display in multi-account UI';

-- ============================================================
-- Verification notes (RLS & board_configs)
-- ============================================================
-- RLS policies on user_integrations are based on auth.uid() = user_id.
-- This remains correct for multi-account since each user still owns their own rows.
-- No RLS policy changes are needed.
--
-- board_configs already has a monday_account_id column (added in migration 20260203205244).
-- It is populated by the frontend when creating new configs (useBoardConfigs.ts).
-- Board configs properly link to the correct Monday account/integration via monday_account_id.
