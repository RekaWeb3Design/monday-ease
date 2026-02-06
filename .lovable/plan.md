
# Client Dashboard (Board Views) — Sort Dropdown for Card/Gallery Views

## Összefoglaló

A CustomViewPage-en már működik a rendezés a Table nézetben (kattintható fejlécek). A feladat: hozzáadni egy sort dropdown-ot a Card és Gallery nézetekhez, ahol nincsenek kattintható oszlopfejlécek.

## Jelenlegi Állapot

**Már Működik:**
- `sortColumn` és `sortOrder` state (60-61. sor)
- `handleSort()` függvény (141-149. sor)
- ViewDataTable kattintható fejlécek sort ikonokkal
- Szerver-oldali rendezés a `useBoardViewData` hook-on keresztül

**Hiányzik:**
- Sort dropdown UI a Card/Gallery nézetekhez

## Technikai Terv

### Fájl: `src/pages/CustomViewPage.tsx`

**1. Új import hozzáadása (már létező importokhoz):**

```typescript
import { ChevronUp, ChevronDown } from "lucide-react";
```

**2. Sort dropdown hozzáadása a View Mode Toggle után (328-367. sorok környékén):**

A header jobb oldalán, a View Mode Toggle és Refresh gomb között:

```tsx
<div className="flex items-center gap-2">
  {/* View Mode Toggle - már létezik */}
  <ToggleGroup ...>
    ...
  </ToggleGroup>

  {/* Sort Dropdown - csak Card/Gallery nézetben */}
  {(settings.view_mode === 'cards' || settings.view_mode === 'gallery') && (
    <div className="flex items-center gap-1">
      <Select
        value={sortColumn || "none"}
        onValueChange={(val) => {
          if (val === "none") {
            setSortColumn(null);
          } else {
            setSortColumn(val);
          }
          setPage(1);
        }}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Default order</SelectItem>
          {settings.show_item_name && (
            <SelectItem value="name">Item Name</SelectItem>
          )}
          {columns.map(col => (
            <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {sortColumn && (
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            setPage(1);
          }}
        >
          {sortOrder === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
          }
        </Button>
      )}
    </div>
  )}

  <Button variant="outline" size="sm" onClick={() => refetch()}>
    ...
  </Button>
  ...
</div>
```

## Viselkedés

| Nézet | Rendezés módja |
|-------|---------------|
| Table | Kattintható oszlopfejlécek (változatlan) |
| Cards | Dropdown + irány gomb |
| Gallery | Dropdown + irány gomb |

## Működési Logika

1. A rendezés **szerver-oldalon** történik a `useBoardViewData` hook-ban
2. A `sortColumn` és `sortOrder` változás automatikusan újra lekéri az adatokat
3. A `setPage(1)` biztosítja, hogy rendezés után az első oldalra ugorjon

## Nem Változik

- `ViewDataTable.tsx` — már működik a rendezés
- `CardView.tsx` — csak a rendezett adatokat kapja
- `GalleryView.tsx` — csak a rendezett adatokat kapja
- Edge Functions — nincs módosítás
- Kliens-oldali szűrés — változatlan, a szűrt elemek már rendezve érkeznek
