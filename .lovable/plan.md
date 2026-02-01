

# Add View Mode Switcher to CustomViewPage

## Overview

Add toggle buttons in the CustomViewPage header allowing users to switch between Table, Cards, and Gallery display modes. The selected mode persists in the view settings stored in the database.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/board-views/CardView.tsx` | Grid of cards showing items |
| `src/components/board-views/GalleryView.tsx` | Larger cards in masonry-style grid |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `view_mode` to `ViewSettings` interface |
| `src/pages/CustomViewPage.tsx` | Add toggle buttons, conditional rendering |
| `src/hooks/useCustomBoardViews.ts` | Update default settings to include view_mode |

---

## Implementation Details

### 1. Update ViewSettings Type

**File: `src/types/index.ts`**

Add `view_mode` field to the `ViewSettings` interface:

```typescript
export interface ViewSettings {
  show_item_name: boolean;
  row_height: 'compact' | 'default' | 'comfortable';
  enable_search: boolean;
  enable_filters: boolean;
  default_sort_column: string | null;
  default_sort_order: 'asc' | 'desc';
  view_mode: 'table' | 'cards' | 'gallery';  // NEW
}
```

---

### 2. Update Default Settings in Hook

**File: `src/hooks/useCustomBoardViews.ts`**

Update the default settings parsing (around line 75-82) to include `view_mode`:

```typescript
settings: row.settings || {
  show_item_name: true,
  row_height: 'default',
  enable_search: true,
  enable_filters: true,
  default_sort_column: null,
  default_sort_order: 'asc',
  view_mode: 'table',  // NEW
},
```

---

### 3. Create CardView Component

**File: `src/components/board-views/CardView.tsx`**

```text
Design:
+------------------+  +------------------+  +------------------+
| Item Name        |  | Item Name        |  | Item Name        |
| [Status Badge]   |  | [Status Badge]   |  | [Status Badge]   |
|                  |  |                  |  |                  |
| Label: Value     |  | Label: Value     |  | Label: Value     |
| Label: Value     |  | Label: Value     |  | Label: Value     |
| Label: Value     |  | Label: Value     |  | Label: Value     |
+------------------+  +------------------+  +------------------+
```

Features:
- 3 columns on desktop (lg), 2 on tablet (md), 1 on mobile
- Card shows item name as title
- Status columns displayed as colored badges
- First 3-4 non-status columns shown as label: value pairs
- Hover effect with slight scale/shadow change
- Uses existing ColumnCell component for value rendering

---

### 4. Create GalleryView Component

**File: `src/components/board-views/GalleryView.tsx`**

```text
Design:
+---------------------------+  +---------------------------+
| Item Name                 |  | Item Name                 |
| [Status Badge] [Badge]    |  | [Status Badge] [Badge]    |
|                           |  |                           |
| Label: Value              |  | Label: Value              |
| Label: Value              |  | Label: Value              |
| Label: Value              |  | Label: Value              |
| Label: Value              |  | Label: Value              |
| Label: Value              |  | Label: Value              |
+---------------------------+  +---------------------------+
```

Features:
- Larger cards (300-350px width)
- More column values visible (all selected columns)
- 2-3 columns on desktop, 1-2 on tablet, 1 on mobile
- Status badges prominently displayed at top
- Good for dashboard/overview feel
- Loading skeleton and empty state handling

---

### 5. Add View Mode Toggle to CustomViewPage

**File: `src/pages/CustomViewPage.tsx`**

#### Add Imports

```typescript
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table as TableIcon, LayoutGrid, Grid3X3 } from "lucide-react";
import { CardView } from "@/components/board-views/CardView";
import { GalleryView } from "@/components/board-views/GalleryView";
```

#### Add Toggle in Header (next to Refresh button)

```tsx
<div className="flex items-center gap-2">
  {/* View Mode Toggle - NEW */}
  <ToggleGroup 
    type="single" 
    value={settings.view_mode || 'table'} 
    onValueChange={(mode) => {
      if (mode && view) {
        updateView(view.id, { 
          settings: { ...settings, view_mode: mode as 'table' | 'cards' | 'gallery' } 
        });
      }
    }}
    className="border rounded-md"
  >
    <ToggleGroupItem value="table" aria-label="Table view" className="px-2.5">
      <TableIcon className="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="cards" aria-label="Card view" className="px-2.5">
      <LayoutGrid className="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="gallery" aria-label="Gallery view" className="px-2.5">
      <Grid3X3 className="h-4 w-4" />
    </ToggleGroupItem>
  </ToggleGroup>

  <Button variant="outline" size="sm" onClick={() => refetch()}>
    <RefreshCw className="h-4 w-4 mr-1" />
    Refresh
  </Button>
  {/* ... Edit button */}
</div>
```

#### Conditional Rendering for View Modes

Replace the current `<ViewDataTable ... />` with:

```tsx
{/* Data display based on view mode */}
{(settings.view_mode || 'table') === 'table' && (
  <ViewDataTable
    columns={columns}
    items={filteredItems}
    settings={settings}
    isLoading={isLoading}
    sortColumn={sortColumn}
    sortOrder={sortOrder}
    onSort={handleSort}
    onColumnsReorder={isOwner ? handleColumnsReorder : undefined}
  />
)}

{settings.view_mode === 'cards' && (
  <CardView
    items={filteredItems}
    columns={columns}
    settings={settings}
    isLoading={isLoading}
  />
)}

{settings.view_mode === 'gallery' && (
  <GalleryView
    items={filteredItems}
    columns={columns}
    settings={settings}
    isLoading={isLoading}
  />
)}
```

---

## Component Props

### CardView & GalleryView

Both components share the same props interface:

```typescript
interface CardViewProps {
  items: ViewDataItem[];
  columns: ViewColumn[];
  settings: ViewSettings;
  isLoading: boolean;
}
```

---

## Visual Layout

### Header with Toggle

```text
+----------------------------------------------------------------------+
| [<-] [View Dropdown ▼]  [Board]      [Table|Cards|Gallery] [Refresh] |
+----------------------------------------------------------------------+
```

### Toggle Button States

| State | Appearance |
|-------|------------|
| Selected | Primary background, white icon |
| Unselected | Ghost/transparent, muted icon |
| Hover | Light background highlight |

---

## Card View Grid

```text
Desktop (lg): 3 columns
+----------+ +----------+ +----------+
| Card 1   | | Card 2   | | Card 3   |
+----------+ +----------+ +----------+
+----------+ +----------+ +----------+
| Card 4   | | Card 5   | | Card 6   |
+----------+ +----------+ +----------+

Tablet (md): 2 columns
+---------------+ +---------------+
| Card 1        | | Card 2        |
+---------------+ +---------------+

Mobile: 1 column
+---------------------------+
| Card 1                    |
+---------------------------+
```

---

## Gallery View Grid

```text
Desktop: 2-3 larger cards per row
+---------------------+ +---------------------+
| Large Card 1        | | Large Card 2        |
| More content        | | More content        |
| visible here        | | visible here        |
+---------------------+ +---------------------+
```

---

## Behavior Summary

| Action | Result |
|--------|--------|
| Click Table icon | Switch to table view, save to DB |
| Click Cards icon | Switch to card grid, save to DB |
| Click Gallery icon | Switch to gallery view, save to DB |
| Page load | Restores last selected mode from settings |

---

## Technical Notes

- View mode persists in `custom_board_views.settings` JSONB field
- No migration needed - existing views default to 'table'
- ToggleGroup ensures only one mode selected at a time
- Empty string from ToggleGroup ignored (mode must be truthy)
- CardView and GalleryView reuse ColumnCell for consistent value rendering
- Both new views handle loading and empty states

