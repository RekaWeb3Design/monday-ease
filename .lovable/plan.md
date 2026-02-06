

# Client Dashboard (Board Views) — Client-Side Search Enhancement

## Összefoglaló

A CustomViewPage-en már létezik egy keresőmező, de jelenleg **szerver-oldali** keresést használ (a `useBoardViewData` hook-on keresztül). A feladat: átalakítani **kliens-oldali** keresésre, ami gyorsabb és nem igényel API hívást minden billentyűleütésnél.

## Jelenlegi Állapot

**Meglévő keresés (szerver-oldali):**
- `search` és `debouncedSearch` state (59-60. sor)
- Debounce logika (67-73. sor)
- `useBoardViewData` hook kapja a `search` paramétert (87. sor)
- Keresőmező UI (421-442. sor)

**Probléma:**
- Minden keresés API hívást generál
- 300ms debounce késleltetés
- Nem azonnal reagál a felhasználói inputra

## Technikai Terv

### Fájl: `src/pages/CustomViewPage.tsx`

**1. Eltávolítani a szerver-oldali keresést:**

Távolítsuk el a `debouncedSearch` state-et és a debounce effect-et, és ne küldjük a search paramétert a hook-nak:

```typescript
// ELŐTTE (59-60. sor):
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

// UTÁNA:
const [searchQuery, setSearchQuery] = useState("");

// TÖRÖLNI (67-73. sor):
// A teljes debounce useEffect eltávolítása

// MÓDOSÍTANI (84-90. sor):
const { ... } = useBoardViewData({
  viewId: view?.id || null,
  page,
  // search: debouncedSearch, ← TÖRÖLNI
  sortColumn,
  sortOrder,
});
```

**2. Kliens-oldali keresés hozzáadása (a `filteredItems` után):**

```typescript
// Kliens-oldali keresés (a filteredItems után)
const searchedItems = useMemo(() => {
  if (!searchQuery.trim()) return filteredItems;
  const query = searchQuery.toLowerCase().trim();
  return filteredItems.filter(item => {
    // Keresés a task nevében
    if (item.name.toLowerCase().includes(query)) return true;
    // Keresés az összes oszlop szöveges értékében
    return Object.values(item.column_values).some(cv => 
      cv?.text && cv.text.toLowerCase().includes(query)
    );
  });
}, [filteredItems, searchQuery]);
```

**3. Keresőmező UI frissítése:**

```tsx
{/* Search Input */}
<div className="relative flex-1">
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

{/* Találatok száma (csak aktív keresésnél) */}
{searchQuery && (
  <span className="text-sm text-muted-foreground whitespace-nowrap">
    Showing {searchedItems.length} of {filteredItems.length}
  </span>
)}
```

**4. `searchedItems` használata minden view-ban:**

```tsx
{/* Table View */}
{(settings.view_mode || 'table') === 'table' && (
  <ViewDataTable
    columns={columns}
    items={searchedItems}  // ← filteredItems helyett
    ...
  />
)}

{/* Card View */}
{settings.view_mode === 'cards' && (
  <CardView
    items={searchedItems}  // ← filteredItems helyett
    ...
  />
)}

{/* Gallery View */}
{settings.view_mode === 'gallery' && (
  <GalleryView
    items={searchedItems}  // ← filteredItems helyett
    ...
  />
)}
```

**5. Footer item count frissítése:**

```tsx
<p className="text-sm text-muted-foreground">
  Showing {searchedItems.length} of {totalCount} items
  {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
  {searchQuery && ` • searching for "${searchQuery}"`}
</p>
```

## Adatfolyam (Frissített)

```text
items (Edge Function-ből, rendezve)
    ↓
filteredItems (oszlop szűrők — kliens-oldali)
    ↓
searchedItems (keresés — kliens-oldali, ÚJ)
    ↓
→ ViewDataTable / CardView / GalleryView
```

## Viselkedés

| Művelet | Hatás |
|---------|-------|
| Keresés gépelés | Azonnali szűrés (nincs debounce, nincs API hívás) |
| "X" gomb | Törli a keresést |
| Tab/view váltás | Keresés megmarad |
| Oldal újratöltés | Keresés elvész (nem perzisztens) |

## Nem Változik

- `ViewDataTable.tsx` — változatlan
- `CardView.tsx` — változatlan
- `GalleryView.tsx` — változatlan
- Edge Functions — nincs módosítás
- Rendezés logika — változatlan
- Oszlop szűrők — változatlan

