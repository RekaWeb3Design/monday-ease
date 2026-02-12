

# "Viewing as" Panel — Tabbed Board View with Table Layout

## Summary

Transform the MemberViewSheet from a flat card grid into a tabbed, table-based dashboard that mirrors the actual member experience. Tasks will be grouped by `board_name`, each board gets its own tab, and items display in a clean table with sortable columns and colored status badges.

## Current State

- **File**: `src/components/organization/MemberViewSheet.tsx` (144 lines)
- **Data**: `MondayTask[]` with `column_values` as an **Array** (not Record)
- **Layout**: Flat grid of `TaskCard` components, all boards mixed together
- **Stats**: `TaskStats` component shows totals across all tasks

## Data Structure Reference

```text
MondayTask {
  id, name, board_id, board_name,
  column_values: MondayColumnValue[] ← ARRAY, use .find()
}

MondayColumnValue {
  id, title, type, text, value
  value.label_style?.color ← hex color for status badges
}
```

## Technical Plan

### File: `src/components/organization/MemberViewSheet.tsx`

**1. New imports:**
- Add `useMemo, useState` from React
- Add `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Add `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- Add `Badge` from `@/components/ui/badge`
- Remove `TaskCard` import (no longer used here)

**2. Group tasks by board:**

```typescript
const boardGroups = useMemo(() => {
  const groups: Record<string, { boardName: string; tasks: MondayTask[] }> = {};
  for (const task of tasks) {
    const key = task.board_id;
    if (!groups[key]) {
      groups[key] = { boardName: task.board_name, tasks: [] };
    }
    groups[key].tasks.push(task);
  }
  return Object.entries(groups).map(([boardId, data]) => ({
    boardId,
    boardName: data.boardName,
    tasks: data.tasks,
  }));
}, [tasks]);
```

**3. Active tab state + filtered stats:**

```typescript
const [activeTab, setActiveTab] = useState<string>("");

// Set default tab when data loads
useEffect(() => {
  if (boardGroups.length > 0 && !activeTab) {
    setActiveTab(boardGroups[0].boardId);
  }
}, [boardGroups]);

// Get active board's tasks for stats
const activeBoard = boardGroups.find(b => b.boardId === activeTab);
const activeTasks = activeBoard?.tasks || tasks;
```

**4. Get columns from task data (derive visible columns per board):**

```typescript
const getBoardColumns = (boardTasks: MondayTask[]) => {
  if (boardTasks.length === 0) return [];
  // Collect all unique columns across tasks, preserving order from first task
  const columnMap = new Map<string, { id: string; title: string; type: string }>();
  for (const task of boardTasks) {
    for (const cv of task.column_values) {
      if (!columnMap.has(cv.id)) {
        columnMap.set(cv.id, { id: cv.id, title: cv.title, type: cv.type });
      }
    }
  }
  return Array.from(columnMap.values());
};
```

**5. Replace the task grid section (lines 117-140) with tabbed table layout:**

```text
Structure:
- TaskStats receives activeTasks (scoped to active tab)
- Tabs component with one tab per board (showing task count)
- Each TabsContent contains a Table with:
  - "Name" column (always first)
  - Dynamic columns from task.column_values
  - Status/color columns rendered as colored Badge
  - Date columns formatted nicely
  - Other columns show text value
```

**6. Cell rendering logic:**

```typescript
const renderCellValue = (col: MondayColumnValue) => {
  if (!col.text) return <span className="text-muted-foreground">-</span>;

  // Status/color columns → colored badge
  if (col.type === "status" || col.type === "color") {
    const labelColor = col.value?.label_style?.color;
    return (
      <Badge
        className="text-xs"
        style={labelColor ? {
          backgroundColor: labelColor,
          color: "white",
          border: "none",
        } : undefined}
      >
        {col.text}
      </Badge>
    );
  }

  // Date columns → formatted
  if (col.type === "date") {
    try {
      return format(new Date(col.text), "MMM dd");
    } catch { return col.text; }
  }

  return <span className="truncate">{col.text}</span>;
};
```

**7. Table structure per tab:**

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      {columns.map(col => <TableHead key={col.id}>{col.title}</TableHead>)}
    </TableRow>
  </TableHeader>
  <TableBody>
    {boardTasks.map(task => (
      <TableRow key={task.id}>
        <TableCell className="font-medium">{task.name}</TableCell>
        {columns.map(col => {
          const cv = task.column_values.find(c => c.id === col.id);
          return <TableCell key={col.id}>{cv ? renderCellValue(cv) : "-"}</TableCell>;
        })}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**8. Empty state per tab:**

If a board tab has 0 tasks: "No tasks assigned on this board"

**9. Single board optimization:**

If only one board exists, skip the Tabs wrapper entirely and show the table directly (no need for tabs with a single option).

## New Layout

```text
+----------------------------------------------+
| Viewing as                           X Close  |
| Member Name                     Edit Boards   |
+----------------------------------------------+
| 41 tasks assigned                   Refresh   |
+----------------------------------------------+
| [Total: 41] [Progress: 5] [Done: 30] [Stuck: 2] |
+----------------------------------------------+   <- stats scoped to active tab
| [ Board A (25) ] [ Board B (16) ]             |
+----------------------------------------------+
| Name          | Status     | Type    | Date   |
|---------------|------------|---------|--------|
| Paid Meta Ad  | Published  | Ad      | Feb 03 |
| Insta Story   | Published  | Social  | Feb 01 |
+----------------------------------------------+
```

## Data Flow

```text
tasks (from get-member-tasks)
    |
    v
boardGroups (grouped by board_id/board_name)
    |
    v
activeTab selects one group
    |
    v
activeTasks -> TaskStats (scoped stats)
    |
    v
Table rendering with column_values.find() access
```

## What Does NOT Change

- `useMemberTasksForMember` hook (data fetching unchanged)
- `get-member-tasks` edge function (no backend changes)
- Organization page layout
- Edit Boards button and Refresh button
- Sheet open/close behavior
- `TaskStats` component (reused as-is, just receives filtered tasks)
- `TaskCard` component (stays in codebase, just no longer used here)

## Additional Import

- `format` from `date-fns` for date column formatting
- `useEffect` added to React imports

