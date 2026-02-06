
# Member Dashboard Sorting & Filtering

## Összefoglaló

Keresés és rendezés funkciók hozzáadása a Member Dashboard-hoz. A tagok kereshetnek a taskok között, és rendezhetik őket oszlopok szerint (list view-ban kattintható fejlécekkel, grid view-ban dropdown-nal).

## Felhasználói Élmény

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ My Tasks                                      [▦|☰]  [🔄 Refresh]          │
│ Welcome back, John! Here are your assigned tasks.                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ All Tasks (24) ]  [ Tasks (12) ]  [ Deliverables (8) ]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Stats Cards Row                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [🔍 Search tasks...              ✕]  Showing 5 of 12   [Sort: ▼] [↑↓]     │
│                                                          ↑ only grid view   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ NAME ↑        │ BOARD   │ PRIORITY  │ STATUS    │ EST. HOURS       │   │
│  │───────────────┼─────────┼───────────┼───────────┼──────────────────│   │
│  │ Task name...  │ Tasks   │ 🟠 High   │ 🔵 Done   │ 8                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technikai Terv

### Fájl 1: `src/pages/MemberDashboard.tsx`

**1. Új importok hozzáadása:**

```typescript
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**2. Új state változók:**

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
```

**3. AllColumns kinyerése (useMemo) — közös a sort dropdown és TaskListView számára:**

```typescript
const allColumns = useMemo(() => {
  const cols: { id: string; title: string; type: string }[] = [];
  filteredTasks.forEach(task => {
    task.column_values.forEach(col => {
      if (!cols.find(c => c.id === col.id)) {
        cols.push({ id: col.id, title: col.title, type: col.type });
      }
    });
  });
  return cols;
}, [filteredTasks]);
```

**4. Keresés szűrő (useMemo):**

```typescript
const searchedTasks = useMemo(() => {
  if (!searchQuery.trim()) return filteredTasks;
  const query = searchQuery.toLowerCase().trim();
  return filteredTasks.filter(task => {
    if (task.name.toLowerCase().includes(query)) return true;
    return task.column_values.some(cv => 
      cv.text && cv.text.toLowerCase().includes(query)
    );
  });
}, [filteredTasks, searchQuery]);
```

**5. Rendezés logika (useMemo):**

```typescript
const sortedTasks = useMemo(() => {
  if (!sortColumn) return searchedTasks;
  
  return [...searchedTasks].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";
    
    if (sortColumn === "name") {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortColumn === "board") {
      aVal = a.board_name.toLowerCase();
      bVal = b.board_name.toLowerCase();
    } else {
      const aCol = a.column_values.find(cv => cv.id === sortColumn);
      const bCol = b.column_values.find(cv => cv.id === sortColumn);
      
      if (aCol?.type === "numbers" || aCol?.type === "numeric") {
        aVal = parseFloat(aCol?.text || "0") || 0;
        bVal = parseFloat(bCol?.text || "0") || 0;
      } else {
        aVal = (aCol?.text || "").toLowerCase();
        bVal = (bCol?.text || "").toLowerCase();
      }
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}, [searchedTasks, sortColumn, sortDirection]);
```

**6. Tab váltás kezelő (reset search & sort):**

```typescript
const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  setSearchQuery("");
  setSortColumn(null);
  setSortDirection("asc");
};
```

**7. Sort toggle függvény (list view header kattintáshoz):**

```typescript
const handleSort = (columnId: string) => {
  if (sortColumn === columnId) {
    if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
  } else {
    setSortColumn(columnId);
    setSortDirection("asc");
  }
};
```

**8. Tabs onValueChange frissítése:**

```typescript
<Tabs value={activeTab} onValueChange={handleTabChange}>
```

**9. Új Toolbar komponens (stats után, task view előtt):**

```tsx
{/* Search & Sort Toolbar */}
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
  {/* Search Input */}
  <div className="relative flex-1 max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search tasks..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9 pr-9"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
  
  {/* Result count (only when searching) */}
  {searchQuery && (
    <span className="text-sm text-muted-foreground whitespace-nowrap">
      Showing {sortedTasks.length} of {filteredTasks.length} tasks
    </span>
  )}
  
  {/* Sort controls (only in grid view) */}
  {viewMode === "grid" && (
    <div className="flex items-center gap-1">
      <Select 
        value={sortColumn || "none"} 
        onValueChange={(val) => {
          if (val === "none") {
            setSortColumn(null);
          } else {
            setSortColumn(val);
            if (!sortColumn) setSortDirection("asc");
          }
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default order</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          {allColumns.map(col => (
            <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {sortColumn && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
          className="h-9 w-9"
        >
          {sortDirection === "asc" ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
          }
        </Button>
      )}
    </div>
  )}
</div>
```

**10. TaskStats és task view frissítése — sortedTasks használata:**

```typescript
<TaskStats tasks={sortedTasks} />

{viewMode === "grid" ? (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {sortedTasks.map((task) => (
      <TaskCard 
        key={task.id} 
        task={task} 
        showBoardName={activeTab === "all"} 
      />
    ))}
  </div>
) : (
  <TaskListView 
    tasks={sortedTasks} 
    showBoardName={activeTab === "all"}
    allColumns={allColumns}
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={handleSort}
  />
)}
```

---

### Fájl 2: `src/components/member/TaskListView.tsx`

**1. Új importok:**

```typescript
import { ChevronUp, ChevronDown } from "lucide-react";
```

**2. Props interface bővítése:**

```typescript
interface TaskListViewProps {
  tasks: MondayTask[];
  showBoardName: boolean;
  allColumns: { id: string; title: string; type: string }[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (columnId: string) => void;
}
```

**3. AllColumns belső számítás eltávolítása — props-ból jön:**

```typescript
export function TaskListView({ 
  tasks, 
  showBoardName, 
  allColumns,
  sortColumn,
  sortDirection,
  onSort 
}: TaskListViewProps) {
  // Remove the internal allColumns calculation - now passed as prop
```

**4. Sortable header helper komponens:**

```tsx
const SortableHeader = ({ 
  columnId, 
  children, 
  className = "" 
}: { 
  columnId: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <th
    className={`font-semibold text-muted-foreground uppercase text-xs py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors ${className}`}
    onClick={() => onSort(columnId)}
  >
    <div className="flex items-center gap-1">
      {children}
      {sortColumn === columnId && (
        sortDirection === "asc" 
          ? <ChevronUp className="h-3 w-3" /> 
          : <ChevronDown className="h-3 w-3" />
      )}
    </div>
  </th>
);
```

**5. Header row frissítése sortable header-ekkel:**

```tsx
<thead>
  <tr className="bg-muted/50 border-b border-border">
    <SortableHeader columnId="name" className="text-left">
      Name
    </SortableHeader>
    {showBoardName && (
      <SortableHeader columnId="board" className="text-left">
        Board
      </SortableHeader>
    )}
    {allColumns.map((col) => (
      <SortableHeader 
        key={col.id} 
        columnId={col.id}
        className={col.type === "numbers" ? "text-right" : "text-left"}
      >
        {col.title}
      </SortableHeader>
    ))}
  </tr>
</thead>
```

---

## Adatfolyam

```text
tasks (API)
    ↓
filteredTasks (tab filter)
    ↓
searchedTasks (search filter)
    ↓
sortedTasks (sort)
    ↓
→ TaskStats (count display)
→ TaskCard grid / TaskListView table
```

## Viselkedés Összefoglaló

| Művelet | Hatás |
|---------|-------|
| Keresés gépelés | Azonnal szűr task name + column values alapján |
| "X" gomb | Törli a keresést, összes task megjelenik |
| Tab váltás | Reseteli search + sort, új board taskok |
| List view header kattintás | Ciklikus: asc → desc → nincs sort |
| Grid view sort dropdown | Kiválasztja a rendezési oszlopot |
| Grid view ↑↓ gomb | Irány váltás (asc/desc) |
| View mode váltás | Megtartja search + sort állapotot |

## Nem Változik

- `TaskCard.tsx` — változatlan
- `TaskStats.tsx` — változatlan (már props-ból kapja a tasks-ot)
- Edge Functions — nincs módosítás
- Típusok — nincs módosítás
- Színes badge-ek — változatlanul működnek
