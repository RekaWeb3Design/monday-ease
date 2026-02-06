
# Member Dashboard Grid/List View Toggle

## Összefoglaló

A Member Dashboard-hoz hozzáadunk egy nézet váltó gombot (Grid/List toggle), amely lehetővé teszi, hogy a felhasználó válasszon a jelenlegi kártya nézet és egy új táblázatos lista nézet között.

## Felhasználói Élmény

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ My Tasks                                      [▦|☰]  [🔄 Refresh]          │
│ Welcome back, John! Here are your assigned tasks.                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [ All Tasks (24) ]  [ Tasks (12) ]  [ Deliverables (8) ]                  │
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Stats cards  │ │ Stats cards  │ │ Stats cards  │ │ Stats cards  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Grid View:                        OR      List View:                        │
│  ┌─────────┐ ┌─────────┐                  | NAME           | BOARD  | ...  │
│  │ Card 1  │ │ Card 2  │                  | Task 1         | Tasks  | ...  │
│  └─────────┘ └─────────┘                  | Task 2         | Tasks  | ...  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technikai Terv

### 1. Új Komponens: `src/components/member/TaskListView.tsx`

Táblázatos nézet a task-okhoz, hasonlóan a Client Dashboard-hoz.

**Struktúra:**
- HTML táblázat Tailwind class-okkal (egyszerű, könnyűsúlyú)
- Sticky fejléc sor
- Alternáló sor hover állapotok
- Horizontális scroll mobilon

**Oszlopok:**
1. **Name** - mindig első, bal igazítás, truncate
2. **Board** - csak ha `showBoardName={true}` (All Tasks tab-on)
3. **Dinamikus oszlopok** a `column_values`-ból:
   - `status`/`color` → színes badge (`label_style.color`)
   - `numbers` → jobb igazítás
   - `text` → truncate (~40 karakter)
   - egyéb → `text` mező vagy "—"

**Props:**
```typescript
interface TaskListViewProps {
  tasks: MondayTask[];
  showBoardName: boolean;
}
```

### 2. Módosítás: `src/pages/MemberDashboard.tsx`

**Új importok:**
```typescript
import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskListView } from "@/components/member/TaskListView";
```

**Új state:**
```typescript
const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
```

**Header layout frissítés:**
- Toggle group a Refresh gomb mellett (bal oldalra)
- LayoutGrid ikon → grid nézet
- List ikon → list nézet
- Aktív állapot: filled/highlighted

**Feltételes renderelés:**
```typescript
{viewMode === "grid" ? (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {filteredTasks.map((task) => (
      <TaskCard key={task.id} task={task} showBoardName={activeTab === "all"} />
    ))}
  </div>
) : (
  <TaskListView tasks={filteredTasks} showBoardName={activeTab === "all"} />
)}
```

---

## Részletes Fájl Változások

### Fájl 1: `src/components/member/TaskListView.tsx` (ÚJ)

```typescript
import { Badge } from "@/components/ui/badge";
import type { MondayTask, MondayColumnValue } from "@/types";

interface TaskListViewProps {
  tasks: MondayTask[];
  showBoardName: boolean;
}

// Check if column is a status type
function isStatusColumn(col: MondayColumnValue): boolean {
  return col.type === "status" || col.type === "color";
}

// Extract color from column value's label_style
function getColumnColor(col: MondayColumnValue): string | null {
  if (typeof col.value === "object" && col.value?.label_style?.color) {
    return col.value.label_style.color;
  }
  return null;
}

export function TaskListView({ tasks, showBoardName }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  // Get all unique columns from all tasks
  const allColumns = tasks.reduce((acc, task) => {
    task.column_values.forEach((col) => {
      if (!acc.find((c) => c.id === col.id)) {
        acc.push({ id: col.id, title: col.title, type: col.type });
      }
    });
    return acc;
  }, [] as { id: string; title: string; type: string }[]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left font-semibold text-gray-600 uppercase text-xs py-3 px-4">
              Name
            </th>
            {showBoardName && (
              <th className="text-left font-semibold text-gray-600 uppercase text-xs py-3 px-4">
                Board
              </th>
            )}
            {allColumns.map((col) => (
              <th
                key={col.id}
                className={`font-semibold text-gray-600 uppercase text-xs py-3 px-4
                  ${col.type === "numbers" ? "text-right" : "text-left"}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr
              key={task.id}
              className={`border-b hover:bg-gray-50 transition-colors
                ${index % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}
            >
              {/* Task name */}
              <td className="py-3 px-4 font-medium text-gray-900 max-w-[300px] truncate">
                {task.name}
              </td>

              {/* Board name badge */}
              {showBoardName && (
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">
                    {task.board_name}
                  </Badge>
                </td>
              )}

              {/* Dynamic columns */}
              {allColumns.map((colDef) => {
                const col = task.column_values.find((c) => c.id === colDef.id);
                const labelColor = col ? getColumnColor(col) : null;

                return (
                  <td
                    key={colDef.id}
                    className={`py-3 px-4 ${colDef.type === "numbers" ? "text-right" : ""}`}
                  >
                    {isStatusColumn(colDef) && col?.text ? (
                      <Badge
                        className="text-xs"
                        style={
                          labelColor
                            ? { backgroundColor: labelColor, color: "white", border: "none" }
                            : undefined
                        }
                      >
                        {col.text}
                      </Badge>
                    ) : (
                      <span className={`${col?.text ? "text-gray-700" : "text-gray-300"} text-sm max-w-[200px] truncate block`}>
                        {col?.text || "—"}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Fájl 2: `src/pages/MemberDashboard.tsx`

**Változás 1 - Új importok (8. sor):**
```typescript
import { Loader2, RefreshCw, ClipboardList, LayoutList, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskListView } from "@/components/member/TaskListView";
```

**Változás 2 - Új state (13. sor után):**
```typescript
const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
```

**Változás 3 - Header layout (109-120. sor):**
```typescript
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
    <p className="text-muted-foreground">
      Welcome back, {displayName}! Here are your assigned tasks.
    </p>
  </div>
  <div className="flex items-center gap-2">
    <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")}>
      <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view" size="sm">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
    <Button onClick={refetch} variant="outline" size="sm">
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh
    </Button>
  </div>
</div>
```

**Változás 4 - Task view feltételes renderelés (149-158. sor):**
```typescript
{/* Task view - uses filtered tasks */}
{viewMode === "grid" ? (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {filteredTasks.map((task) => (
      <TaskCard 
        key={task.id} 
        task={task} 
        showBoardName={activeTab === "all"} 
      />
    ))}
  </div>
) : (
  <TaskListView 
    tasks={filteredTasks} 
    showBoardName={activeTab === "all"} 
  />
)}
```

---

## Viselkedés Összefoglaló

| Állapot | Grid nézet | List nézet |
|---------|-----------|------------|
| All Tasks tab | Kártya + board badge | Táblázat + board oszlop |
| Specifikus board tab | Kártya, nincs board badge | Táblázat, nincs board oszlop |
| 0 task | Üres állapot | "No tasks to display" |
| Mobil | 1 oszlopos grid | Horizontális scroll |

## Nem Változik

- `TaskCard.tsx` - változatlan marad
- `TaskStats.tsx` - változatlan marad
- Edge Functions - nincs módosítás
- Tab rendszer - változatlanul működik mindkét nézetben
- Színes státusz badge-ek - mindkét nézetben működnek
