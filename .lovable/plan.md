

# Enhance Demo Dashboard: Kanban, Task Detail Panel, and Donut Chart

## Overview

Add three major features to the Demo Dashboard: a Kanban view toggle on the Tasks tab, a task detail side panel accessible from all tabs, and a donut chart on the Overview tab. This involves creating 2 new files and modifying 5 existing files.

## New Files

### 1. `src/components/demo-dashboard/DemoDashboardContext.tsx`

A React Context providing shared state for the task detail panel:
- `selectedTask: DemoTask | null`
- `isDetailOpen: boolean`
- `openTaskDetail(task: DemoTask): void`
- `closeTaskDetail(): void`

The provider wraps the entire DemoDashboard page content.

### 2. `src/components/demo-dashboard/TaskDetailPanel.tsx`

A shadcn `Sheet` (side="right") that opens when any task is clicked. Width ~420px via className on `SheetContent`.

**Panel sections:**

**Header**: Task name as `SheetTitle`, category badge below

**Section 1 -- "Reszletek"**:
- StatusBadge and PriorityBadge (displayed larger)
- Due date: formatted with "Lejart!" in red if overdue, or "X nap van hatra" in green if upcoming
- Felelosok: vertical list of assignees with colored avatar circles and full names

**Section 2 -- "Haladas"**:
- Larger ProgressBar (h-3)
- "X/Y alfeladat kesz" text
- Fake subtask checklist generated from a helper function based on task name and subtask counts. Done items get line-through + green checkmark, remaining get gray checkbox

**Section 3 -- "Aktivitas"** (fake timeline):
- 3-4 hardcoded activity entries with small avatars, descriptive text, and relative timestamps
- Connected by a vertical line

## Modified Files

### 3. `src/pages/DemoDashboard.tsx`

- Import and wrap content with `DemoDashboardProvider`
- Import `TaskDetailPanel` and render it inside the provider (once, at the bottom)

### 4. `src/components/demo-dashboard/TasksTab.tsx`

**View toggle**: Add a toggle button group (List / Columns3 icons from lucide-react) to the right of the existing filter bar. State: `viewMode: "table" | "kanban"`.

**Kanban view** (when viewMode === "kanban"):
- `flex flex-row gap-4 overflow-x-auto pb-4`
- One column per status (filtered to only statuses with matching tasks)
- Column: `min-w-[280px] w-[280px]`, header with status color at 15% opacity, bold name + count badge
- Column body: `bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[200px]`
- Cards: white, rounded-lg, shadow-sm, showing task name (max 2 lines), category tag, AvatarStack + PriorityBadge, due date + small ProgressBar (w-20)
- Each card and table row calls `openTaskDetail(task)` on click

Search and status filters apply to both views. In kanban, status filter shows only that column.

### 5. `src/components/demo-dashboard/OverviewTab.tsx`

**Row 2 layout change**: `grid grid-cols-1 lg:grid-cols-2 gap-4`
- Left: existing "Statusz eloszlas" horizontal bar card (unchanged)
- Right: new "Statusz megoszlas" card with a CSS conic-gradient donut chart
  - 180x180px circle with `conic-gradient()` computed from status proportions
  - Inner white circle for the donut hole
  - Center text: total count (large bold) + "feladat" below
  - Hover: slight scale effect on the container

**Attention items**: Each item calls `openTaskDetail(task)` on click with `cursor-pointer`

### 6. `src/components/demo-dashboard/TeamTab.tsx`

- Import and use `useDemoDashboard` context
- Each task item in the scrollable list gets `cursor-pointer` and `onClick={() => openTaskDetail(task)}`

### 7. `src/components/demo-dashboard/TimelineTab.tsx`

- Import and use `useDemoDashboard` context
- Each content pill gets `cursor-pointer` and `onClick={() => openTaskDetail(task)}`

## Technical Details

### Subtask name generation (in TaskDetailPanel)

A helper function that generates realistic subtask names based on the task category and name:

```text
const SUBTASK_TEMPLATES = {
  Backend: ["Endpoint tervezes", "Auth implementalas", "Adatbazis migracio", "Unit tesztek", "Code review", "Dokumentacio"],
  Frontend: ["UI design", "Komponens fejlesztes", "Reszponziv nezet", "Teszteles", "Akadalymentes..."],
  QA: ["Teszt terv", "Teszt esetek", "Automatizalas", "Regresszio", "Jelentes", ...],
  ...
}
```

Pick `subtasksTotal` names, mark first `subtasksDone` as completed.

### Donut chart (CSS conic-gradient)

```text
background: conic-gradient(
  #00CA72 0deg Xdeg,    // Kesz
  #FDAB3D Xdeg Ydeg,    // Folyamatban
  ...
);
```

Computed dynamically from status counts. Inner circle is a centered white div (60% of outer size) creating the donut hole.

### View toggle styling

Active button: `bg-primary text-white` (uses the #01cb72 green primary)
Inactive button: `bg-gray-100 text-gray-600`
Grouped together with `rounded-lg overflow-hidden flex`

## File Summary

| File | Action |
|------|--------|
| `src/components/demo-dashboard/DemoDashboardContext.tsx` | Create |
| `src/components/demo-dashboard/TaskDetailPanel.tsx` | Create |
| `src/pages/DemoDashboard.tsx` | Modify -- wrap with provider, add panel |
| `src/components/demo-dashboard/TasksTab.tsx` | Modify -- add kanban view + toggle + click handler |
| `src/components/demo-dashboard/OverviewTab.tsx` | Modify -- add donut chart + click handlers |
| `src/components/demo-dashboard/TeamTab.tsx` | Modify -- add click handlers |
| `src/components/demo-dashboard/TimelineTab.tsx` | Modify -- add click handlers |

