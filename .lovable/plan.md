

# Member Dashboard Multi-Board Tab System

## Összefoglaló

A Member Dashboard átalakítása, hogy a taskok board-onként tabulátorokban legyenek szervezve. Az első tab minden taskot mutat (jelenlegi viselkedés), a további tabok pedig board-onként szűrik a taskokat.

## Felhasználói Élmény

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ My Tasks                                              [🔄 Refresh]       │
│ Welcome back, John! Here are your assigned tasks.                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ 📋 All Tasks (24) ]  [ Tasks (12) ]  [ Deliverables (8) ]  [ ... ]  │
│  ═══════════════════                                                     │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Total: 24    │ │ In Progress  │ │ Done: 8      │ │ Stuck: 2     │    │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                                          │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                  │
│  │ Task Card 1   │ │ Task Card 2   │ │ Task Card 3   │                  │
│  │ [Board badge] │ │ [Board badge] │ │ [Board badge] │ ← "All" tab-on   │
│  └───────────────┘ └───────────────┘ └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technikai Terv

### Fájl 1: `src/pages/MemberDashboard.tsx`

**Változások:**

1. **Új importok:**
```typescript
import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList } from "lucide-react";
```

2. **Tab állapot kezelés:**
```typescript
const [activeTab, setActiveTab] = useState<string>("all");
```

3. **Board-ok kinyerése és taskok szűrése (useMemo):**
```typescript
// Extract unique boards from tasks
const boards = useMemo(() => {
  const boardMap = new Map<string, string>();
  tasks.forEach(task => {
    if (!boardMap.has(task.board_id)) {
      boardMap.set(task.board_id, task.board_name);
    }
  });
  return Array.from(boardMap.entries()).map(([id, name]) => ({ id, name }));
}, [tasks]);

// Filter tasks based on active tab
const filteredTasks = useMemo(() => {
  if (activeTab === "all") return tasks;
  return tasks.filter(task => task.board_id === activeTab);
}, [tasks, activeTab]);
```

4. **Tab komponens beillesztése (header és stats közé):**
```typescript
{/* Tab Navigation */}
{boards.length > 0 && (
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
      <TabsTrigger 
        value="all" 
        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
      >
        <LayoutList className="mr-1.5 h-4 w-4" />
        All Tasks ({tasks.length})
      </TabsTrigger>
      {boards.map((board) => (
        <TabsTrigger 
          key={board.id} 
          value={board.id}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          {board.name} ({tasks.filter(t => t.board_id === board.id).length})
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
)}
```

5. **Stats és TaskCard frissítése:**
```typescript
{/* Stats row - pass filtered tasks */}
<TaskStats tasks={filteredTasks} />

{/* Task grid - pass filtered tasks and showBoardName prop */}
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {filteredTasks.map((task) => (
    <TaskCard 
      key={task.id} 
      task={task} 
      showBoardName={activeTab === "all"} 
    />
  ))}
</div>
```

---

### Fájl 2: `src/components/member/TaskCard.tsx`

**Változások:**

1. **Interface bővítése:**
```typescript
interface TaskCardProps {
  task: MondayTask;
  showBoardName?: boolean;  // New prop
}
```

2. **Prop destruktúra frissítése:**
```typescript
export function TaskCard({ task, showBoardName = true }: TaskCardProps) {
```

3. **Board name badge feltételes megjelenítése:**
```typescript
<div className="flex items-center gap-2 pt-1">
  {showBoardName && (
    <Badge variant="outline" className="text-xs">
      {task.board_name}
    </Badge>
  )}
  {statusCol && statusText && (() => {
    // ... existing status badge logic
  })()}
</div>
```

---

### Fájl 3: `src/components/member/TaskStats.tsx`

**Nincs változás szükséges!** A TaskStats már helyesen működik - a kapott `tasks` tömb alapján számolja a statisztikákat. Mivel a MemberDashboard a `filteredTasks`-ot fogja átadni, a statisztikák automatikusan az aktív tab szerinti taskokat fogják mutatni.

---

## Viselkedés Összefoglaló

| Helyzet | Viselkedés |
|---------|------------|
| 0 task összesen | Jelenlegi üres állapot (tab-ok nélkül) |
| 1 board, N task | Tab-ok megjelennek: "All Tasks (N)" + "BoardName (N)" |
| M board, N task | Tab-ok: "All Tasks (N)" + M darab board tab |
| "All Tasks" tab aktív | Stats: összes task, Cards: board badge látható |
| Board tab aktív | Stats: csak az adott board taskjai, Cards: board badge rejtett |
| Refresh gomb | Újra lekéri az összes taskot, tab "all"-on marad |

## Mobil Viselkedés

A TabsList `flex-wrap` stílussal rendelkezik, így mobil nézetben a tabok több sorba tördelődnek ha szükséges. Alternatívaként ScrollArea-val horizontálisan görgethetővé is tehető.

## Nem Változik

- Edge Function (`get-member-tasks`) - nincs módosítás
- API hívások - nincs új hívás
- Típusok (`types/index.ts`) - nincs módosítás
- Színes státusz badge-ek - változatlanul működnek
- Routing - nincs új route

