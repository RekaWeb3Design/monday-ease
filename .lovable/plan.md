

# Implement Csapat (Team) and Idővonal (Timeline) Tabs

## Overview

Create two new tab components and update `DemoDashboard.tsx` to replace the remaining placeholders. Also add a footer to the page.

## New Files

### 1. `src/components/demo-dashboard/TeamTab.tsx`

Responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`) of 5 member cards.

Each card iterates over `TEAM_MEMBERS` and computes tasks from `getAllTasks()` where the member name is in `task.assignees`.

**Card structure:**
- `bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden`
- Top border: `border-t-[3px]` with member color via inline style
- **Header** (`p-5 pb-4`): avatar circle (w-12 h-12, member color bg, white initials text-lg font-bold) + name (font-bold) + role (text-xs text-gray-500)
- **Stats row** (`px-5 pb-3 grid grid-cols-4 gap-2`): four mini stat boxes
  - "Osszes" -- total count, bg-gray-50
  - "Kesz" -- status=Kesz count, bg-green-50, green text
  - "Aktiv" -- status=Folyamatban count, bg-yellow-50, yellow text
  - "Figyel!" -- stuck + overdue (due < today AND status != Kesz) count, bg-red-50, red text
- **Task list** (`px-5 pb-5`): `max-h-48 overflow-y-auto space-y-1.5`, each task as `bg-gray-50 rounded-lg p-2 text-xs flex justify-between items-center` with truncated name + StatusBadge

### 2. `src/components/demo-dashboard/TimelineTab.tsx`

All tasks from `getAllTasks()` sorted by `due` date ascending.

Single white card (`rounded-xl shadow-sm border p-6`). Each task renders a row with 3 columns:

1. **Date column** (w-24, text-right): show date only if different from previous task's date. "MA" in blue bold if today, red if overdue, gray otherwise
2. **Timeline column** (center): small circle (w-3 h-3 rounded-full border-2) -- green filled if done, red border if overdue, blue border otherwise. Vertical line (w-0.5 bg-gray-200) between items (not after last)
3. **Content column** (flex-1): rounded-lg pill with bg-red-50 if overdue, bg-green-50 if done, bg-gray-50 otherwise. Task name left, AvatarStack + StatusBadge + PriorityBadge right

### 3. Modified: `src/pages/DemoDashboard.tsx`

- Import `TeamTab` and `TimelineTab`
- Replace Csapat placeholder (lines 49-58) with `<TeamTab />`
- Replace Idovonal placeholder (lines 60-69) with `<TimelineTab />`
- Add footer after the Tabs wrapper div: `<p className="text-[10px] text-gray-400 text-center pt-4">MondayEase Smart Dashboard — Powered by Monday.com adatok | Utolso szinkron: 2026.02.12 15:30</p>`

## File Summary

| File | Action |
|------|--------|
| `src/components/demo-dashboard/TeamTab.tsx` | Create |
| `src/components/demo-dashboard/TimelineTab.tsx` | Create |
| `src/pages/DemoDashboard.tsx` | Modify -- swap placeholders, add footer |

