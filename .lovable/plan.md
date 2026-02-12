

# Global Filter Toolbar and Workload Heatmap

## Summary

Add a global filter toolbar that affects all 4 tabs simultaneously, and a workload visualization section to each Team tab member card. This involves creating 1 new file and modifying 6 existing files.

## New Files

### 1. `src/components/demo-dashboard/GlobalFilters.tsx`

A toolbar component rendered between the demo banner and the Tabs on DemoDashboard.tsx.

**Container**: `bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap`

**Contents (left to right):**

1. Label: "Szurok:" (text-sm font-medium text-gray-500)

2. **Member filter** -- 5 clickable avatar chips (w-6 h-6 circle + first name). Unselected: gray border/bg. Selected: member-color border + ring. Reads `selectedMembers` / `toggleMember` from context.

3. **Priority filter** -- 4 small toggle buttons (emoji + label). Active: priority color bg, white text. Inactive: bg-gray-100. Reads `selectedPriorities` / `togglePriority` from context.

4. **Date range** -- 4 radio-style buttons: "Ma", "Ez a het", "Ez a honap", "Osszes". Active: bg-primary text-white. Reads `dateRange` / `setDateRange` from context.

5. **Active filter count + Clear button** -- shown only when any filter is active. Displays "X szuro aktiv" badge + ghost "Szurok torlese" button with X icon that calls `clearFilters`.

## Modified Files

### 2. `src/components/demo-dashboard/DemoDashboardContext.tsx`

Expand the context with new state and computed values:

**New state:**
- `selectedMembers: string[]` (empty = all)
- `selectedPriorities: string[]` (empty = all)
- `dateRange: "today" | "week" | "month" | "all"` (default: "all")

**New functions:**
- `toggleMember(name: string)` -- toggle name in/out of selectedMembers
- `togglePriority(priority: string)` -- toggle priority in/out of selectedPriorities
- `setDateRange(range)` -- set date range
- `clearFilters()` -- reset all filters to defaults
- `activeFilterCount: number` -- computed count of active filter categories

**New computed value:**
- `filteredTasks: DemoTask[]` -- memoized array applying all 3 filters to `getAllTasks()`
- `filteredGroups: TaskGroup[]` -- memoized TASK_GROUPS with tasks filtered

**Filter logic:**
- Member: task has at least one assignee in selectedMembers (or all if empty)
- Priority: task.priority is in selectedPriorities (or all if empty)
- Date range: "today" = task.due === today, "week" = task.due within Mon-Sun of current week, "month" = same month/year, "all" = no filter

### 3. `src/pages/DemoDashboard.tsx`

- Import `GlobalFilters`
- Render `<GlobalFilters />` between the amber demo banner and the Tabs div
- Update tab trigger labels to show filtered counts from context, e.g., `Feladatok (8)` when filters reduce the count below 14
- Access `filteredTasks` from context for the count

### 4. `src/components/demo-dashboard/OverviewTab.tsx`

- Replace `getAllTasks()` with `filteredTasks` from `useDemoDashboard()` context
- All stat computations (stats, statusCounts, attentionTasks, donutGradient) now derive from `filteredTasks`
- Handle edge case: if filteredTasks is empty, show a "Nincs talalat" message instead of dividing by zero in donut chart

### 5. `src/components/demo-dashboard/TasksTab.tsx`

- Replace `getAllTasks()` with `filteredTasks` from context
- Replace the TASK_GROUPS-based filtering with `filteredGroups` from context, then apply local search/status filters on top
- The local search and status filters remain as additional filters within the tab

### 6. `src/components/demo-dashboard/TimelineTab.tsx`

- Replace `getAllTasks()` with `filteredTasks` from context
- Sort the filtered list by due date as before

### 7. `src/components/demo-dashboard/TeamTab.tsx`

- Replace `getAllTasks()` with `filteredTasks` from context for the per-member task lists
- Add workload visualization between the stats row and the task list

**Workload indicator bar** (added after stats row, before task list):
- Calculate workload score: sum of (priority weight) for active (non-done) tasks, divided by 5, capped at 100%
- Priority weights: Kritikus=4, Magas=3, Kozepes=2, Alacsony=1
- Bar: h-2 rounded-full bg-gray-200 in mx-5 mb-2
- Fill color: green if <40%, yellow 40-70%, red >70%
- Label: "Konnyu" / "Kozepes" / "Tulterhelt" with matching color
- Small text: "X aktiv feladat, Y lejart"

**Weekly mini chart** (below workload bar, px-5 pb-2):
- 5 small rectangles (w-8 h-6 rounded) for Mon-Fri
- Color based on tasks due that day: 0=bg-gray-100, 1=bg-blue-200, 2=bg-blue-400, 3+=bg-blue-600
- Labels below: H, K, Sz, Cs, P
- Uses the current week's dates to match tasks

**Team summary row** (above the member cards grid):
- Card with title "Csapat osszefoglalo"
- 3 stats in a grid (grid-cols-3):
  - "Atlagos terheles": average workload % across members, with color indicator
  - "Legtobb feladat": member name with highest task count
  - "Figyelmet igenyel": member names with stuck/overdue tasks

## Technical Notes

### Date range filter implementation

```text
today: task.due === format(today, "yyyy-MM-dd")
week:  startOfWeek(today, {weekStartsOn:1}) <= taskDue <= endOfWeek(today, {weekStartsOn:1})
month: task.due starts with "YYYY-MM" of current month
all:   no filter
```

Uses date-fns (already installed) for `startOfWeek`, `endOfWeek`, `format`.

### Workload score formula

```text
score = sum(priorityWeight for each non-done task) / 5
capped at 100
```

Where priorityWeight map: { "Kritikus": 4, "Magas": 3, "Kozepes": 2, "Alacsony": 1 }

### Weekly mini chart date mapping

Generate Mon-Fri dates for the current week, count how many of the member's tasks have `due` matching each date. This is a simple `.filter().length` for each day.

## File Summary

| File | Action |
|------|--------|
| `src/components/demo-dashboard/GlobalFilters.tsx` | Create |
| `src/components/demo-dashboard/DemoDashboardContext.tsx` | Modify -- add filter state, filteredTasks, filteredGroups |
| `src/pages/DemoDashboard.tsx` | Modify -- add GlobalFilters, show filtered counts on tabs |
| `src/components/demo-dashboard/OverviewTab.tsx` | Modify -- use filteredTasks from context |
| `src/components/demo-dashboard/TasksTab.tsx` | Modify -- use filteredTasks/filteredGroups from context |
| `src/components/demo-dashboard/TeamTab.tsx` | Modify -- use filteredTasks, add workload bar + mini chart + summary row |
| `src/components/demo-dashboard/TimelineTab.tsx` | Modify -- use filteredTasks from context |

