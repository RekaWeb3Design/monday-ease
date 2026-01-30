-- Add filter_column_type to board_configs table
ALTER TABLE public.board_configs
ADD COLUMN filter_column_type text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.board_configs.filter_column_type IS 'The Monday.com column type (e.g., people, text, dropdown) for the filter column';