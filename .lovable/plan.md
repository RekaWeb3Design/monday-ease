

# Add Column Filters to Custom Board View Page

## Overview

Add a client-side filtering system to the Custom View page that allows users to filter data by column values. Filters appear below the search bar when `settings.enable_filters` is true, with different filter types based on column data type.

---

## Implementation Details

### File to Modify: `src/pages/CustomViewPage.tsx`

#### 1. Add Filter State

Add a new state variable to track active filters:

```typescript
const [filters, setFilters] = useState<Record<string, string>>({});
```

#### 2. Extract Unique Filter Options

Create a `useMemo` hook to extract unique values from current items for each filterable column:

```typescript
const filterOptions = useMemo(() => {
  const options: Record<string, { value: string; label: string; color?: string }[]> = {};
  
  columns.forEach(col => {
    const uniqueValues = new Map<string, { label: string; color?: string }>();
    
    items.forEach(item => {
      const cellValue = item.column_values[col.id];
      if (cellValue?.text || cellValue?.label) {
        const key = cellValue.label || cellValue.text || '';
        if (key && !uniqueValues.has(key)) {
          uniqueValues.set(key, {
            label: key,
            color: cellValue.label_style?.color
          });
        }
      }
    });
    
    if (uniqueValues.size > 0 && uniqueValues.size <= 20) {
      options[col.id] = Array.from(uniqueValues.entries())
        .map(([value, meta]) => ({ value, ...meta }));
    }
  });
  
  return options;
}, [columns, items]);
```

#### 3. Filter Items Client-Side

Filter the items array before passing to the table:

```typescript
const filteredItems = useMemo(() => {
  if (Object.keys(filters).length === 0) return items;
  
  return items.filter(item => {
    return Object.entries(filters).every(([columnId, filterValue]) => {
      if (!filterValue || filterValue === 'all') return true;
      
      const cellValue = item.column_values[columnId];
      const column = columns.find(c => c.id === columnId);
      
      // Date column special handling
      if (column?.type === 'date') {
        if (!cellValue?.text) return filterValue === 'none';
        const date = parseISO(cellValue.text);
        if (filterValue === 'overdue') return isPast(date) && !isToday(date);
        if (filterValue === 'today') return isToday(date);
        if (filterValue === 'this_week') return isThisWeek(date);
        return true;
      }
      
      // Status/dropdown - exact match
      const displayValue = cellValue?.label || cellValue?.text || '';
      return displayValue === filterValue;
    });
  });
}, [items, filters, columns]);
```

#### 4. Create Filter Bar Component

Render a filter bar with dropdowns for each filterable column:

```tsx
{/* Filter bar */}
{settings.enable_filters && Object.keys(filterOptions).length > 0 && (
  <div className="flex flex-wrap items-center gap-2">
    {columns.map(col => {
      const options = filterOptions[col.id];
      if (!options) return null;
      
      const isDateColumn = col.type === 'date';
      
      if (isDateColumn) {
        return (
          <Select
            key={col.id}
            value={filters[col.id] || 'all'}
            onValueChange={(v) => setFilters(prev => ({ ...prev, [col.id]: v }))}
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder={col.title} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      
      const isStatusColumn = col.type === 'status' || col.type === 'color';
      
      return (
        <Select
          key={col.id}
          value={filters[col.id] || 'all'}
          onValueChange={(v) => setFilters(prev => ({ ...prev, [col.id]: v }))}
        >
          <SelectTrigger className="h-8 min-w-[120px] max-w-[180px]">
            <SelectValue placeholder={col.title} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {col.title}</SelectItem>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {isStatusColumn && opt.color ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: opt.color }}
                    />
                    {opt.label}
                  </div>
                ) : (
                  opt.label
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    })}
    
    {/* Clear Filters Button */}
    {activeFilterCount > 0 && (
      <Button
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => setFilters({})}
      >
        Clear Filters
        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
          {activeFilterCount}
        </Badge>
      </Button>
    )}
  </div>
)}
```

#### 5. Calculate Active Filter Count

```typescript
const activeFilterCount = useMemo(() => {
  return Object.values(filters).filter(v => v && v !== 'all').length;
}, [filters]);
```

#### 6. Update Table Data Source

Pass `filteredItems` instead of `items` to the table and update the count display:

```tsx
<ViewDataTable
  columns={columns}
  items={filteredItems}  // Changed from items
  settings={settings}
  // ... rest of props
/>

// Update footer count
<p className="text-sm text-muted-foreground">
  Showing {filteredItems.length} of {totalCount} items
  {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
</p>
```

---

## New Imports Required

```typescript
import { isThisWeek } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

---

## Filter Type Logic Summary

| Column Type | Filter UI | Filter Logic |
|-------------|-----------|--------------|
| `status`, `color` | Dropdown with colored dots | Exact match on label |
| `date` | Quick filters dropdown | Date range comparison |
| `dropdown` | Dropdown with unique values | Exact match on text |
| Other (text, etc.) | Shown if <= 20 unique values | Exact match |

---

## UI Layout (Final)

```text
+------------------------------------------+
| [Search items...                    ] 🔍  |
+------------------------------------------+
| [Status: All ▼] [Priority: All ▼] [Due: All ▼] [Clear Filters (2)] |
+------------------------------------------+
| Table...                                 |
+------------------------------------------+
| Showing 12 of 50 items (2 filters active)|
+------------------------------------------+
```

---

## Notes

- Filters are client-side only (no edge function changes)
- Filter options are auto-detected from current page data
- Columns with > 20 unique values are excluded from dropdowns
- Empty string values use 'all' as the value (per Radix UI constraint)
- Status columns show colored indicator dots in dropdown
- Date columns have predefined quick filter options

