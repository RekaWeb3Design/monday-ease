

# Custom Board Views Implementation Plan

## Overview

A new feature for organization owners to create custom "Board Views" - dynamic data tables that display selected columns from Monday.com boards, accessible to all organization members as sub-pages in the dashboard.

---

## Database Changes

### New Table: `custom_board_views`

```sql
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

-- Indexes
CREATE INDEX idx_cbv_org ON public.custom_board_views(organization_id);
CREATE INDEX idx_cbv_board ON public.custom_board_views(monday_board_id);
CREATE INDEX idx_cbv_active ON public.custom_board_views(organization_id, is_active);

-- RLS Policies
ALTER TABLE public.custom_board_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can manage views"
  ON public.custom_board_views FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = custom_board_views.organization_id
      AND o.owner_id = auth.uid()
    )
  );

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
```

---

## File Structure

```text
src/
├── pages/
│   ├── BoardViews.tsx              # Management page (/board-views)
│   └── CustomViewPage.tsx          # Dynamic view page (/board-views/:slug)
├── components/
│   └── board-views/
│       ├── CreateViewDialog.tsx    # Multi-step wizard
│       ├── ViewCard.tsx            # Card for management grid
│       ├── ViewDataTable.tsx       # Data table component
│       ├── ColumnCell.tsx          # Render cells by column type
│       └── IconPicker.tsx          # Lucide icon selector
├── hooks/
│   └── useCustomBoardViews.ts      # CRUD hook for views
│   └── useBoardViewData.ts         # Fetch data from edge function
├── types/
│   └── index.ts                    # Add new types
supabase/
└── functions/
    └── get-board-view-data/
        └── index.ts                # Edge function for data fetching
```

---

## Implementation Details

### 1. Types (`src/types/index.ts`)

Add new interfaces:

```typescript
// Custom board view configuration
export interface CustomBoardView {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  monday_board_id: string;
  monday_board_name: string | null;
  selected_columns: ViewColumn[];
  settings: ViewSettings;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ViewColumn {
  id: string;
  title: string;
  type: string;
  width?: number;
}

export interface ViewSettings {
  show_item_name: boolean;
  row_height: 'compact' | 'default' | 'comfortable';
  enable_search: boolean;
  enable_filters: boolean;
  default_sort_column: string | null;
  default_sort_order: 'asc' | 'desc';
}
```

### 2. Hook: `useCustomBoardViews.ts`

CRUD operations for custom views:
- `fetchViews()` - Load all views for organization
- `createView(data)` - Create new view
- `updateView(id, data)` - Update existing view
- `deleteView(id)` - Delete view
- Auto-generate slug from view name

### 3. Hook: `useBoardViewData.ts`

Fetch real-time data from edge function:
- Parameters: `viewId`, `page`, `search`, `sortColumn`, `sortOrder`
- Returns: `items`, `totalCount`, `isLoading`, `error`
- Triggers refetch when params change

### 4. Edge Function: `get-board-view-data`

```typescript
// Endpoint: GET /get-board-view-data?view_id=uuid&page=1&limit=50&search=keyword&sort=column_id&order=asc

// Flow:
// 1. Validate JWT and get user
// 2. Fetch view config from database
// 3. Verify user has access (org member or owner)
// 4. Get organization owner's Monday token
// 5. Decrypt token and call Monday.com API
// 6. Filter columns based on view configuration
// 7. Apply search, sorting, pagination
// 8. Return formatted response

// Response:
{
  view: { name, icon, settings, columns },
  items: [{ id, name, column_values: {...} }],
  total_count: number,
  page: number,
  limit: number
}
```

### 5. Management Page: `BoardViews.tsx`

Route: `/board-views` (owner only)

Layout:
- Header with "Custom Board Views" title and "Create View" button
- Grid of `ViewCard` components
- Empty state with CTA to create first view

### 6. Create View Dialog: `CreateViewDialog.tsx`

Multi-step wizard (4 steps):

**Step 1 - Basic Info:**
- Name input (required)
- Description textarea (optional)
- IconPicker component

**Step 2 - Select Board:**
- Use existing `useMondayBoards` hook
- Board dropdown with name and type
- Show column count after selection

**Step 3 - Configure Columns:**
- Checkbox list of available columns
- Column type icon next to each
- Width input for selected columns
- Reorder with drag-and-drop (optional)

**Step 4 - Display Settings:**
- Toggle: Show item name column
- Select: Row height (compact/default/comfortable)
- Toggle: Enable search bar
- Toggle: Enable column filters
- Default sort column/order selects

### 7. View Card: `ViewCard.tsx`

Card display for each view:
- Icon + View name
- Source board badge
- Column count
- Active/Inactive toggle
- Actions: Edit, Preview, Delete

### 8. Custom View Page: `CustomViewPage.tsx`

Route: `/board-views/:slug`

Sections:
- **Header**: Back button, view name + icon, board badge, refresh button
- **Filter bar**: Search input, column-specific filters (if enabled)
- **Data table**: Using `ViewDataTable` component
- **Footer**: Item count, pagination controls

### 9. Data Table: `ViewDataTable.tsx`

Features:
- Column headers from view config
- Sortable columns (click to toggle)
- Resizable column widths
- `ColumnCell` renders value by type
- Loading skeleton state
- Empty state handling

### 10. Column Cell: `ColumnCell.tsx`

Render cell based on column type:
- **Status**: Colored badge with Monday.com colors
- **Date**: Formatted date, overdue in red
- **Person**: Avatar + name
- **Text**: Truncated with tooltip
- **Number**: Right-aligned

### 11. Icon Picker: `IconPicker.tsx`

Grid of commonly used Lucide icons:
- Table, LayoutGrid, List, Calendar, Users, FileText, etc.
- Searchable
- Click to select

### 12. Sidebar Updates: `AppSidebar.tsx`

Add "Board Views" section for owners:
- Parent item: "Board Views" with LayoutGrid icon
- Fetch active views using `useCustomBoardViews`
- Display up to 5 views as sub-items
- "See all" link if more than 5

---

## Routing Updates (`App.tsx`)

Add new routes:

```tsx
<Route path="/board-views" element={...}>
  <BoardViews />
</Route>

<Route path="/board-views/:slug" element={...}>
  <CustomViewPage />
</Route>
```

---

## Monday.com Status Colors

```typescript
const statusColors: Record<string, string> = {
  'Done': '#00CA72',
  'Working on it': '#FDAB3D',
  'Stuck': '#E2445C',
  'Pending': '#579BFC',
  'Not Started': '#C4C4C4',
};
```

---

## Implementation Order

1. **Database** - Run migration to create table with RLS
2. **Types** - Add interfaces to types file
3. **Edge Function** - Create `get-board-view-data` function
4. **Hooks** - Implement `useCustomBoardViews` and `useBoardViewData`
5. **Components** - Build UI components (ViewCard, CreateViewDialog, etc.)
6. **Pages** - Create BoardViews and CustomViewPage
7. **Routing** - Add routes to App.tsx
8. **Sidebar** - Update navigation with dynamic views

---

## Technical Notes

- Reuse existing patterns from `useBoardConfigs` hook
- Follow `AddBoardDialog` wizard pattern for CreateViewDialog
- Use owner's Monday.com token for API calls (same as `get-member-tasks`)
- Slug generation: lowercase, replace spaces with hyphens, remove special chars
- View data is NOT cached - always fetches real-time from Monday.com
- Pagination limit: 50 items per page

