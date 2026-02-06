

# Client Dashboard (/c/:slug) — Search & Sort

## Összefoglaló

Keresés és rendezés funkciók hozzáadása a jelszóval védett Client Dashboard-hoz (`/c/:slug`). Jelenleg ez az oldal multi-board tabokkal és táblázattal rendelkezik, de nincs keresés, rendezés vagy nézet váltás.

## Jelenlegi Állapot

- **Fájl**: `src/pages/ClientDashboard.tsx` (465 sor, self-contained)
- **Belső `BoardTable` komponens**: 372-465. sor
- **Adatstruktúra**: `column_values` Record típusú (nem Array!)
  ```typescript
  item.column_values[colId] // ← helyes
  // NEM: item.column_values.find(cv => cv.id === colId)
  ```

## Technikai Terv

### 1. Új importok (1-18. sor környékén)

```typescript
import { Lock, LogOut, Loader2, AlertCircle, LayoutDashboard, Search, X, ChevronUp, ChevronDown } from "lucide-react";
```

### 2. Új state változók (52-61. sor után)

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
```

### 3. Filter és Sort függvények (a komponens belsejében)

```typescript
// Keresés szűrő
const getFilteredItems = (items: ClientDashboardData["boards"][number]["items"]) => {
  if (!searchQuery.trim()) return items;
  const query = searchQuery.toLowerCase().trim();
  return items.filter(item => {
    if (item.name.toLowerCase().includes(query)) return true;
    return Object.values(item.column_values).some(cv => 
      cv?.text && cv.text.toLowerCase().includes(query)
    );
  });
};

// Rendezés
const getSortedItems = (items: ClientDashboardData["boards"][number]["items"]) => {
  if (!sortColumn) return items;
  
  return [...items].sort((a, b) => {
    let aVal: string | number = "";
    let bVal: string | number = "";
    
    if (sortColumn === "name") {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else {
      const aCol = a.column_values[sortColumn];
      const bCol = b.column_values[sortColumn];
      
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
};

// Sort toggle handler
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

### 4. Tab váltásnál reset (337. sor)

```tsx
<Tabs 
  defaultValue={boards[0]?.boardId ?? "default"} 
  className="w-full"
  onValueChange={() => {
    setSearchQuery("");
    setSortColumn(null);
    setSortDirection("asc");
  }}
>
```

### 5. BoardTable props bővítése

```typescript
interface BoardTableProps {
  board: ClientBoard | null | undefined;
  renderCellValue: (value: any, type: string) => React.ReactNode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  handleSort: (columnId: string) => void;
  getFilteredItems: (items: any[]) => any[];
  getSortedItems: (items: any[]) => any[];
}
```

### 6. BoardTable hívások frissítése

Egy board esetén (334. sor):
```tsx
<BoardTable 
  board={boards[0]} 
  renderCellValue={renderCellValue}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  handleSort={handleSort}
  getFilteredItems={getFilteredItems}
  getSortedItems={getSortedItems}
/>
```

Több board esetén (357. sor):
```tsx
<BoardTable 
  board={board} 
  renderCellValue={renderCellValue}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  handleSort={handleSort}
  getFilteredItems={getFilteredItems}
  getSortedItems={getSortedItems}
/>
```

### 7. BoardTable komponens belső módosítások

**a) Adatpipeline (items helyett):**
```typescript
const filteredItems = getFilteredItems(items);
const sortedItems = getSortedItems(filteredItems);
```

**b) Keresőmező UI (CardHeader után, CardContent előtt):**
```tsx
<CardHeader className="pb-3">
  <CardTitle className="text-lg font-semibold text-gray-800">{boardName}</CardTitle>
</CardHeader>

{/* Search bar */}
<div className="px-4 pb-4">
  <div className="flex items-center gap-3">
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search items..."
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
    {searchQuery && (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Showing {sortedItems.length} of {items.length}
      </span>
    )}
  </div>
</div>
```

**c) Name/Item oszlop fejléc (kattintható):**
```tsx
{!hasNameColumn && (
  <TableHead 
    className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4 cursor-pointer hover:bg-muted/50 select-none"
    onClick={() => handleSort("name")}
  >
    <div className="flex items-center gap-1">
      Item
      {sortColumn === "name" && (
        sortDirection === "asc" 
          ? <ChevronUp className="h-3 w-3" /> 
          : <ChevronDown className="h-3 w-3" />
      )}
    </div>
  </TableHead>
)}
```

**d) Dinamikus oszlop fejlécek (kattintható):**
```tsx
{columns.map((col) => (
  <TableHead
    key={col?.id ?? Math.random()}
    className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4 cursor-pointer hover:bg-muted/50 select-none"
    onClick={() => handleSort(col.id)}
  >
    <div className="flex items-center gap-1">
      {col?.title ?? ""}
      {sortColumn === col.id && (
        sortDirection === "asc" 
          ? <ChevronUp className="h-3 w-3" /> 
          : <ChevronDown className="h-3 w-3" />
      )}
    </div>
  </TableHead>
))}
```

**e) Táblázat body sortedItems használata:**
```tsx
<TableBody>
  {sortedItems.map((item, index) => (
    // ... meglévő row renderelés
  ))}
</TableBody>
```

**f) Üres állapot kezelés (szűrés után):**
```tsx
if (!sortedItems.length) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-800">{boardName}</CardTitle>
      </CardHeader>
      {/* Search bar */}
      <div className="px-4 pb-4">
        {/* ... search input ... */}
      </div>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          {searchQuery ? "No items match your search" : "No items to display"}
        </p>
      </CardContent>
    </Card>
  );
}
```

## Adatfolyam

```text
board.items
    ↓
filteredItems (keresés szűrő)
    ↓
sortedItems (rendezés)
    ↓
→ Table renderelés
```

## Viselkedés Összefoglaló

| Művelet | Hatás |
|---------|-------|
| Keresés gépelés | Azonnali szűrés name + column values alapján |
| "X" gomb | Törli a keresést |
| Tab váltás | Reseteli search + sort |
| Fejléc kattintás | Ciklikus: asc → desc → nincs sort |

## FONTOS: column_values hozzáférés

```typescript
// ClientDashboard (Record típus):
const aCol = a.column_values[sortColumn];

// NEM így (ez a MemberDashboard pattern, Array típus):
// const aCol = a.column_values.find(cv => cv.id === sortColumn);
```

## Nem Változik

- Jelszavas autentikáció
- Tab rendszer
- Színes status badge-ek
- Edge Functions
- Többi komponens

