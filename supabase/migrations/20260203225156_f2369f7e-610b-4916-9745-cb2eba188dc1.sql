-- Backfill workspace_name from user_integrations for existing configs
UPDATE board_configs bc
SET workspace_name = (
  SELECT ui.workspace_name 
  FROM user_integrations ui
  WHERE ui.monday_account_id = bc.monday_account_id
  AND ui.workspace_name IS NOT NULL
  LIMIT 1
)
WHERE bc.workspace_name IS NULL 
AND bc.monday_account_id IS NOT NULL;