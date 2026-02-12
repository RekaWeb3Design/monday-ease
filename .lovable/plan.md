

# Demo Dashboard: Overview and Tasks Tabs

## Summary

Create a demo data file and 6 new component files to populate the first two tabs of the Demo Dashboard with realistic Hungarian demo data, then update the main DemoDashboard page to use them.

## New Files

### 1. `src/data/demoData.ts` -- Static demo data

All constants in a single file:
- `STATUS_OPTIONS`: array of `{ label, color }` for 6 statuses (Kesz, Folyamatban, Elakadt, Varakozik, Felulvizsgalat, Tervezes)
- `PRIORITY_OPTIONS`: array of `{ label, color, emoji }` for 4 priorities
- `TEAM_MEMBERS`: array of 5 members with `name, role, initials, color`
- `TASK_GROUPS`: array of 4 groups, each with `name, color, tasks[]`. Each task has `name, status, priority, assignees (string[]), due, progress, subtasksDone, subtasksTotal, category`
- Helper: `getStatusColor(status)` and `getPriorityInfo(priority)` lookup functions
- All 14 tasks as specified in the prompt, organized into 4 groups

### 2. `src/components/demo-dashboard/StatusBadge.tsx`

Props: `status: string`
- Looks up color from `STATUS_OPTIONS`
- Renders a rounded pill: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white` with `backgroundColor` set to the status color

### 3. `src/components/demo-dashboard/PriorityBadge.tsx`

Props: `priority: string`
- Looks up color and emoji from `PRIORITY_OPTIONS`
- Renders a smaller badge: `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white` with `backgroundColor` set to the priority color

### 4. `src/components/demo-dashboard/AvatarStack.tsx`

Props: `assignees: string[]` (names matching TEAM_MEMBERS)
- Renders overlapping circles (`-ml-2` for overlap, first has `ml-0`)
- Each circle: 28x28px, rounded-full, member color background, white text initials
- Wrapped in shadcn Tooltip showing the full name on hover

### 5. `src/components/demo-dashboard/ProgressBar.tsx`

Props: `value: number` (0-100)
- Thin bar (h-2) with rounded-full, bg-gray-100 track
- Fill color: red (`#E2445C`) if <30%, yellow (`#FDAB3D`) 30-60%, blue (`#0086C0`) 60-99%, green (`#00CA72`) at 100%
- Percentage label to the right: `text-xs text-gray-500`

### 6. `src/components/demo-dashboard/OverviewTab.tsx`

Uses data from `demoData.ts` to compute stats.

**Row 1 -- 5 stat cards** (`grid grid-cols-2 lg:grid-cols-5 gap-4`):
Each card is a white Card with rounded-xl, p-5, shadow-sm, border-gray-100, hover:shadow-md transition. Shows an emoji icon, the count (text-3xl font-bold), the label, and a subtitle.

| Card | Count | Subtitle |
|------|-------|----------|
| Osszes feladat | 14 | "4 csoport" |
| Elkeszult | count where status=Kesz | percentage of total |
| Folyamatban | count where status=Folyamatban | "aktiv sprint" |
| Elakadt | count where status=Elakadt | "figyelmet igenyel" |
| Lejart | overdue count (due < today AND status != Kesz) | "hatarido tullepes" |

**Row 2 -- Status distribution bar** (single Card):
- Title: "Statusz eloszlas"
- A horizontal flex bar (h-10 rounded-lg overflow-hidden) where each segment is proportional to its count
- Legend below with colored dots and counts

**Row 3 -- "Figyelmet igenylő feladatok"** card:
- Filters tasks that are "Elakadt" OR (overdue AND not "Kesz")
- Each item: bg-red-50 border border-red-100 rounded-lg p-3, displays StatusBadge, task name, AvatarStack, due date in red text

### 7. `src/components/demo-dashboard/TasksTab.tsx`

**Top bar**: flex row with:
- Search Input (shadcn Input, placeholder "Kereses...", controlled state)
- Status filter Select (shadcn Select with "Osszes" + all 6 statuses)

**Grouped tables**: For each task group (filtered by search + status):
- Skip group if 0 matching tasks
- Group card: white Card with `border-l-4` in group color
- Group header: group name (bold) + item count badge
- shadcn Table inside with columns: Feladat, Statusz, Prioritas, Felelos, Hatarido, Haladas, Alfeladatok
- TableHead row: bg-gray-50, uppercase text-xs text-gray-500
- TableRow: hover:bg-blue-50/30
- Feladat cell: task name + category tag (text-[10px] bg-gray-100 rounded px-1.5)
- Statusz cell: StatusBadge
- Prioritas cell: PriorityBadge
- Felelos cell: AvatarStack
- Hatarido cell: formatted date, if overdue show warning emoji + red text
- Haladas cell: ProgressBar
- Alfeladatok cell: "x/y" text

### 8. Modified: `src/pages/DemoDashboard.tsx`

- Import `OverviewTab` and `TasksTab`
- Replace the placeholder Card in `TabsContent value="attekintes"` with `<OverviewTab />`
- Replace the placeholder Card in `TabsContent value="feladatok"` with `<TasksTab />`
- Csapat and Idovonal tabs remain as placeholder cards

## File Summary

| File | Action |
|------|--------|
| `src/data/demoData.ts` | Create |
| `src/components/demo-dashboard/StatusBadge.tsx` | Create |
| `src/components/demo-dashboard/PriorityBadge.tsx` | Create |
| `src/components/demo-dashboard/AvatarStack.tsx` | Create |
| `src/components/demo-dashboard/ProgressBar.tsx` | Create |
| `src/components/demo-dashboard/OverviewTab.tsx` | Create |
| `src/components/demo-dashboard/TasksTab.tsx` | Create |
| `src/pages/DemoDashboard.tsx` | Modify (swap placeholders for tab components) |

