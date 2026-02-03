-- Add workspace_name column to store human-readable workspace names
ALTER TABLE public.board_configs 
ADD COLUMN workspace_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.board_configs.workspace_name IS 
  'Monday.com workspace name at the time of board configuration creation';