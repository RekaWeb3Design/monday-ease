-- Fix selected_columns stored as double-encoded strings
UPDATE public.custom_board_views 
SET selected_columns = (selected_columns #>> '{}')::jsonb
WHERE jsonb_typeof(selected_columns) = 'string';

-- Fix settings stored as double-encoded strings
UPDATE public.custom_board_views 
SET settings = (settings #>> '{}')::jsonb
WHERE jsonb_typeof(settings) = 'string';