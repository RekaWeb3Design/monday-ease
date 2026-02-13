

# Client Dashboard View Modes + Build Error Fix

## Overview

Add the same 5 view modes (Grid, List, Charts, Kanban, Timeline) from the Member Dashboard to the Client password-protected dashboard pages, plus fix an existing build error.

## Build Error Fix

**File: `src/components/boards/AddBoardDialog.tsx` (line 484)**

The `fetchBoards` function expects an optional `mondayAccountId` string parameter but is passed directly to `onClick`, which provides a `MouseEvent`. Fix by wrapping in an arrow function: `onClick={() => fetchBoards(selectedAccountId)}`.

## Client Dashboard View Modes

The core challenge is that member components use `MondayTask` (column_values as an **array**), while client data uses `ClientDashboardItem` (column_values as a **Record/object**). The approach is to create an adapter that normalizes client items into MondayTask format, then reuse all existing member view components.

### 1. Create adapter utility: `src/lib/clientTaskAdapter.ts`

A function `clientItemsToTasks` that converts `ClientDashboardItem[]` + board metadata into `MondayTask[]`:

```text
For each ClientDashboardItem:
- Map id, name from the item
- Set board_id and board_name from the parent board
- Convert column_values Record into MondayColumnValue[] array
  (each key becomes {id: key, title: from columns lookup, type, text, value})
- Set created_at/updated_at to empty strings (not available in client data)
```

### 2. Modify `src/pages/ClientDashboard.tsx`

**Add view mode state and toggle** (same as MemberDashboard):
- Add `viewMode` state: `"table" | "grid" | "list" | "charts" | "kanban" | "timeline"` (default: "table")
- Add a `ToggleGroup` in the header area (next to the search bar or at the top of the main content) with icons: List (table), LayoutGrid (grid), BarChart3 (charts), Columns3 (kanban), CalendarDays (timeline)

**Convert items to MondayTask format** using the adapter, then pass to existing member components:
- `TaskCard` for grid view
- `TaskListView` for list view
- `TaskChartsView` for charts view
- `TaskKanbanView` for kanban view
- `TaskTimelineView` for timeline view

**Keep existing table view** as the default (it uses the client-specific Record-based rendering which handles status badges and colors well).

**Update `BoardTable` component**:
- Accept `viewMode` as a prop
- Add the view toggle buttons inside the search bar area
- When viewMode is "table", render the existing table
- For other modes, convert items via the adapter and render the corresponding member component

**Wiring**:
- The view toggle, search, and board tab switching all work together
- Sorting is handled by the member components in their respective views (list has sortable headers, grid has the sort dropdown)
- Charts view shows status donut, board bar, type bar, and deadline charts

### 3. Extract `allColumns` for list view

The `TaskListView` needs an `allColumns` array. Derive this from the board's `columns` definition, filtering to only columns present in the data.

## File Summary

| File | Action |
|------|--------|
| `src/lib/clientTaskAdapter.ts` | Create -- adapter to convert ClientDashboardItem to MondayTask |
| `src/pages/ClientDashboard.tsx` | Modify -- add view toggle, integrate member view components |
| `src/components/boards/AddBoardDialog.tsx` | Modify -- fix build error on line 484 |

## Technical Notes

### Adapter mapping

```text
ClientDashboardItem -> MondayTask:
  id: item.id
  name: item.name
  board_id: board.boardId
  board_name: board.boardName
  column_values: Object.entries(item.column_values).map(([id, cv]) => ({
    id,
    title: board.columns.find(c => c.id === id)?.title || id,
    type: cv.type,
    text: cv.text,
    value: cv.value ?? (cv.label_style ? { label_style: cv.label_style } : null)
  }))
  created_at: ""
  updated_at: ""
```

### View toggle placement

The toggle group will be placed in the `BoardTable` component's search bar row, aligned to the right. This keeps it scoped per board (in multi-board tabs) and consistent with the member dashboard layout.

### Active view styling

Uses the same `ToggleGroup` / `ToggleGroupItem` from shadcn with `data-[state=on]:bg-primary data-[state=on]:text-primary-foreground` -- matching the member dashboard exactly.

