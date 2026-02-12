
# Member Dashboard — WOW Visualizations (3 New View Modes)

## Overview

Add three new view modes to the Member Dashboard toggle: **Charts**, **Kanban**, and **Timeline**. The existing Grid and List views remain untouched. All views use the same data source and respect board tab filtering.

Final toggle order: Grid | List | Charts | Kanban | Timeline

---

## Phase 1: Charts View

### New file: `src/components/member/TaskChartsView.tsx`

A standalone component receiving `tasks: MondayTask[]` as props.

**Four chart panels in a 2x2 grid (1 col on mobile):**

1. **Donut Chart — "Tasks by Status"**
   - Group tasks by primary status column (type === "status" or "color")
   - Use `label_style.color` hex from `column_values` for segment colors
   - Center label shows total count
   - Uses recharts `PieChart` + `Pie` + `Cell` + custom label

2. **Horizontal Bar Chart — "Tasks by Board"**
   - One bar per unique `board_name`
   - All bars use #00CA72
   - Uses recharts `BarChart` with `layout="vertical"`

3. **Vertical Bar Chart — "Tasks by Type"**
   - Find a column with title containing "Type" (case-insensitive), or fall back to first non-status text column
   - Different colors per type value
   - Falls back to "No data available" if no suitable column

4. **Deadline Bar Chart — "Upcoming Deadlines"**
   - Find date column (type === "date")
   - Group into: Overdue (red), This Week (yellow), Next Week (green), Later (gray)
   - Uses `date-fns` helpers: `isPast`, `isThisWeek`, `startOfWeek`, `addWeeks`
   - Falls back to "No date column" message

**No data state per chart**: subtle muted text "No data available" centered in the card.

**Animation**: `animate-in fade-in` CSS on the container.

### Changes to `src/pages/MemberDashboard.tsx`

- Import `BarChart3` from lucide-react
- Import `TaskChartsView` component
- Widen `viewMode` type: `"grid" | "list" | "charts"`
- Add third `ToggleGroupItem` with `BarChart3` icon
- Add conditional render: when `viewMode === "charts"`, render `<TaskChartsView tasks={sortedTasks} />`
- Hide sort controls when charts view is active (sort only relevant for grid/list)

---

## Phase 2: Kanban View

### New file: `src/components/member/TaskKanbanView.tsx`

Receives `tasks: MondayTask[]` and `showBoardName: boolean`.

**Logic:**
- Find primary status column (type === "status" or "color") from tasks
- Group tasks by status text value
- Tasks with no status go to "No Status" column
- Extract `label_style.color` for each status group

**Layout:**
- Horizontal scroll container (`overflow-x-auto`, `snap-x snap-mandatory` on mobile)
- Each column: `min-w-[280px] max-w-[320px]`, light gray background (#F9FAFB), rounded
- Column header: status name + count badge, header strip uses status color at 10% opacity
- Task cards: name (bold), board name (gray, if showBoardName), type + date if available
- Left border on each card using status color
- `shadow-sm` on cards, 8px gap between cards
- Empty columns show "No tasks" in muted text

**No drag-and-drop** — purely visual/read-only.

### Changes to `src/pages/MemberDashboard.tsx`

- Import `Columns3` from lucide-react
- Import `TaskKanbanView`
- Widen type: `"grid" | "list" | "charts" | "kanban"`
- Add fourth `ToggleGroupItem`
- Conditional render for kanban

---

## Phase 3: Timeline View

### New file: `src/components/member/TaskTimelineView.tsx`

Receives `tasks: MondayTask[]` and `showBoardName: boolean`.

**Logic:**
- Find date column (type === "date") from task column_values
- Parse dates, group into sections: "Overdue", "This Week", "Next Week", "Week of [date]", "No Deadline"
- Uses `date-fns`: `isPast`, `isToday`, `isTomorrow`, `isThisWeek`, `startOfWeek`, `addWeeks`, `format`

**Layout:**
- Vertical list with collapsible sections (local state, not localStorage)
- Section headers: colored background (red-50 for overdue, yellow-50 for this week, green-50 for next week, gray-50 for later)
- Icon + section name + task count badge
- Click to expand/collapse with smooth animation

**Task items within sections:**
- Colored status dot (left)
- Task name (bold) + board name (small gray)
- Status badge (colored, using label_style.color)
- Right-aligned date (e.g., "Feb 03")
- Overdue items: subtle red left border + red-tinted bg
- "TODAY" / "TOMORROW" badges on relevant items

**Empty state:** "No deadline column configured for this board"

### Changes to `src/pages/MemberDashboard.tsx`

- Import `CalendarDays` from lucide-react
- Import `TaskTimelineView`
- Final type: `"grid" | "list" | "charts" | "kanban" | "timeline"`
- Add fifth `ToggleGroupItem`
- Conditional render for timeline

---

## Final MemberDashboard View Toggle

```text
[ Grid ] [ List ] [ Charts ] [ Kanban ] [ Timeline ]  [ Refresh ]
```

All five views receive the same `sortedTasks` array and respect the active board tab filter.

Sort controls visibility:
- Grid view: show sort dropdown
- List view: sort via clickable headers
- Charts / Kanban / Timeline: hide sort controls (not applicable)

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/components/member/TaskChartsView.tsx` |
| Create | `src/components/member/TaskKanbanView.tsx` |
| Create | `src/components/member/TaskTimelineView.tsx` |
| Modify | `src/pages/MemberDashboard.tsx` |

## What Does NOT Change

- Data fetching hooks (`useMemberTasks`, `useMemberTasksForMember`)
- Edge functions
- `TaskCard`, `TaskListView`, `TaskStats` components
- Board tab system
- Search and sort logic
- Organization page or Client Dashboard
