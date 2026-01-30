-- Create custom_board_views table
CREATE TABLE public.custom_board_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- View details
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'table',
  
  -- Monday board reference
  monday_board_id TEXT NOT NULL,
  monday_board_name TEXT,
  
  -- Column configuration
  selected_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Display settings
  settings JSONB DEFAULT '{
    "show_item_name": true,
    "row_height": "default",
    "enable_search": true,
    "enable_filters": true,
    "default_sort_column": null,
    "default_sort_order": "asc"
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, slug)
);

-- Indexes for performance
CREATE INDEX idx_cbv_org ON public.custom_board_views(organization_id);
CREATE INDEX idx_cbv_board ON public.custom_board_views(monday_board_id);
CREATE INDEX idx_cbv_active ON public.custom_board_views(organization_id, is_active);

-- Enable RLS
ALTER TABLE public.custom_board_views ENABLE ROW LEVEL SECURITY;

-- Org owners can manage all views
CREATE POLICY "Org owners can manage views"
  ON public.custom_board_views FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = custom_board_views.organization_id
      AND o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = custom_board_views.organization_id
      AND o.owner_id = auth.uid()
    )
  );

-- Active org members can view
CREATE POLICY "Org members can view"
  ON public.custom_board_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = custom_board_views.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_custom_board_views_updated_at
  BEFORE UPDATE ON public.custom_board_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();