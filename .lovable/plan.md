

# Client Dashboard Visual Design Improvements

## Overview
This plan implements comprehensive visual design enhancements for the Client Dashboard (`/c/:slug`) including status badge visibility fixes, proper "name" column handling, and unified UI styling rules.

---

## Changes Summary

### File: `src/pages/ClientDashboard.tsx`

#### 1. Add Status Color Fallback Map
Add a comprehensive color map at the top of the file for consistent status coloring:

```typescript
const STATUS_COLORS: Record<string, string> = {
  "Done": "#00CA72",
  "Working on it": "#FDAB3D", 
  "Stuck": "#E2445C",
  "On Hold": "#579BFC",
  "Not Started": "#C4C4C4",
  "Pending": "#A25DDC",
  "Active": "#00CA72",
  "Sold": "#00CA72",
  "Rented": "#579BFC",
  "Draft": "#C4C4C4",
  "Under Contract": "#FDAB3D",
  "Off Market": "#E2445C",
  "For Sale": "#00CA72",
  "For Rent": "#579BFC",
};
```

#### 2. Fix `getStatusBadge()` Function
Update styling for better visibility:
- White text with text-shadow for readability
- Pill shape (`rounded-full`)
- Consistent padding and min-width
- Use API color or fallback map

```typescript
const getStatusBadge = (value: any, type: string) => {
  if (type !== "status" && type !== "color") return null;

  const text = value?.text || value?.label || "";
  if (!text) return null;

  const bgColor = value?.label_style?.color || STATUS_COLORS[text] || "#C4C4C4";

  return (
    <span
      className="inline-flex items-center justify-center text-white text-xs font-semibold rounded-full py-1 px-3"
      style={{ 
        backgroundColor: bgColor,
        minWidth: "70px",
        textShadow: "0 1px 2px rgba(0,0,0,0.15)"
      }}
    >
      {text}
    </span>
  );
};
```

#### 3. Update `renderCellValue()` Function
Improve empty value display and text styling:

```typescript
const renderCellValue = (value: any, type: string) => {
  if (value === undefined || value === null) {
    return <span className="text-gray-300">—</span>;
  }

  const statusBadge = getStatusBadge(value, type);
  if (statusBadge) return statusBadge;

  const text = value.text || value.label || "";
  if (!text) return <span className="text-gray-300">—</span>;

  return <span className="text-gray-700 text-sm">{text}</span>;
};
```

#### 4. Update Main Content Container
Apply max-width and centered layout:

```tsx
<main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
```

#### 5. Redesign Tabs for Multiple Boards
Custom tab styling with border-based active state:

```tsx
<Tabs defaultValue={boards[0]?.boardId ?? "default"} className="w-full">
  <div className="border-b border-gray-200 mb-6">
    <TabsList className="bg-transparent h-auto p-0 space-x-6">
      {boards.map((board) => (
        <TabsTrigger 
          key={board?.boardId ?? Math.random()} 
          value={board?.boardId ?? ""}
          className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none 
                     border-b-2 border-transparent data-[state=active]:border-primary 
                     rounded-none px-0 pb-3 pt-0
                     text-gray-500 hover:text-gray-700 data-[state=active]:text-gray-900 
                     data-[state=active]:font-semibold font-medium text-sm"
        >
          {board?.boardName ?? "Untitled Board"}
        </TabsTrigger>
      ))}
    </TabsList>
  </div>
  {/* TabsContent remains the same */}
</Tabs>
```

#### 6. Redesign BoardTable Component
Complete table redesign with:
- Improved header styling (uppercase, tracking, bg-gray-50)
- Alternating row backgrounds
- Proper cell padding
- Handle "name" column specially

```tsx
function BoardTable({ board, renderCellValue }: BoardTableProps) {
  // ... null checks remain the same ...

  const columns = board.columns ?? [];
  const items = board.items ?? [];
  const boardName = board.boardName ?? "Untitled Board";

  // Check if "name" is in visible columns (from board config)
  const hasNameColumn = columns.some(col => col.id === "name");

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-800">{boardName}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-100">
                {/* Only show Item column if "name" is NOT in visible columns */}
                {!hasNameColumn && (
                  <TableHead className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4">
                    Item
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead 
                    key={col?.id ?? Math.random()} 
                    className="font-semibold text-gray-600 uppercase text-xs tracking-wider py-3 px-4"
                  >
                    {col?.title ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow 
                  key={item?.id ?? Math.random()}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                >
                  {/* Only show Item cell if "name" is NOT in visible columns */}
                  {!hasNameColumn && (
                    <TableCell className="font-medium text-gray-900 py-3 px-4">
                      {item?.name ?? "—"}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell 
                      key={col?.id ?? Math.random()} 
                      className={`py-3 px-4 ${col.id === 'name' ? 'font-medium text-gray-900' : ''}`}
                    >
                      {col.id === 'name' 
                        ? (item?.name ?? '—')
                        : renderCellValue(item?.column_values?.[col?.id], col?.type ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Visual Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Status badges | Hard to read, inconsistent | White text, pill shape, text-shadow, min-width |
| "name" column | Not handled | Renders item.name correctly |
| Empty values | Shows "-" | Shows "—" in gray-300 |
| Table headers | Basic | Uppercase, tracking, bg-gray-50, gray-600 text |
| Table rows | No alternating | Odd white, even bg-gray-50/50 |
| Row hover | None | bg-gray-50 with transition |
| Cell padding | Inconsistent | py-3 px-4 consistently |
| Tabs | Default shadcn | Border-bottom active state, gray inactive |
| Page width | Full container | max-w-7xl centered |
| Board cards | Basic | Subtle shadow |

---

## Technical Notes

- Uses Tailwind utility classes for all styling
- Inline styles only for dynamic colors (status background, text-shadow)
- No new dependencies required
- Backward compatible with existing data structure

