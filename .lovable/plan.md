

# Add Draggable Column Headers to ViewDataTable

## Overview

Add horizontal drag-and-drop functionality to column headers in the ViewDataTable component, allowing users to reorder columns live in the table view with automatic debounced saving to the database.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/board-views/ViewDataTable.tsx` | Add DnD context, SortableHeader component, reorder handler |
| `src/pages/CustomViewPage.tsx` | Add local columns state, debounced save, pass callback to table |

---

## Implementation Details

### 1. Update ViewDataTable.tsx

#### Add Imports

```typescript
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
```

#### Update Props Interface

```typescript
interface ViewDataTableProps {
  columns: ViewColumn[];
  items: ViewDataItem[];
  settings: ViewSettings;
  isLoading: boolean;
  sortColumn: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (columnId: string) => void;
  onColumnsReorder?: (newColumns: ViewColumn[]) => void; // NEW
}
```

#### Create SortableHeader Component

```typescript
function SortableHeader({
  column,
  sortColumn,
  sortOrder,
  onSort,
  SortIcon,
}: {
  column: ViewColumn;
  sortColumn: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: () => void;
  SortIcon: React.ComponentType<{ columnId: string }>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: column.width || 150,
    minWidth: column.width || 100,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        "group",
        isDragging && "opacity-50 bg-muted"
      )}
    >
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 h-8 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            onSort();
          }}
        >
          {column.title}
          <SortIcon columnId={column.id} />
        </Button>
      </div>
    </TableHead>
  );
}
```

#### Add Sensors and DragEnd Handler

Inside the ViewDataTable component:

```typescript
// Drag-and-drop sensors
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
);

// Handle column reorder
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over && active.id !== over.id && onColumnsReorder) {
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    const newColumns = arrayMove(columns, oldIndex, newIndex);
    onColumnsReorder(newColumns);
  }
};
```

#### Wrap TableHeader with DnD Context

```tsx
<TableHeader>
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
  >
    <SortableContext
      items={columns.map(c => c.id)}
      strategy={horizontalListSortingStrategy}
    >
      <TableRow>
        {settings.show_item_name && (
          <TableHead className="w-[200px]">
            <Button variant="ghost" size="sm" ... >
              Item Name
              <SortIcon columnId="name" />
            </Button>
          </TableHead>
        )}
        {columns.map((col) => (
          <SortableHeader
            key={col.id}
            column={col}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            onSort={() => onSort(col.id)}
            SortIcon={SortIcon}
          />
        ))}
      </TableRow>
    </SortableContext>
  </DndContext>
</TableHeader>
```

---

### 2. Update CustomViewPage.tsx

#### Add Local Columns State

```typescript
// Local columns state for responsive reordering
const [localColumns, setLocalColumns] = useState<ViewColumn[]>([]);

// Sync local columns with view data
useEffect(() => {
  const cols = viewData?.columns || view?.selected_columns || [];
  setLocalColumns(cols);
}, [viewData?.columns, view?.selected_columns]);
```

#### Add Debounced Save Function

```typescript
import debounce from a useMemo pattern:

// Debounced save for column reorder
const debouncedSaveColumns = useMemo(
  () => {
    let timeoutId: NodeJS.Timeout;
    return (newColumns: ViewColumn[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (view) {
          const success = await updateView(view.id, { selected_columns: newColumns });
          if (success) {
            toast({
              title: "Column order saved",
              description: "Your column arrangement has been saved.",
            });
          }
        }
      }, 1000);
    };
  },
  [view, updateView, toast]
);
```

#### Add Reorder Handler

```typescript
const handleColumnsReorder = (newColumns: ViewColumn[]) => {
  // Update local state immediately for responsive UI
  setLocalColumns(newColumns);
  // Debounce the database save
  debouncedSaveColumns(newColumns);
};
```

#### Update ViewDataTable Usage

```tsx
<ViewDataTable
  columns={localColumns}  // Use local state instead of viewData.columns
  items={filteredItems}
  settings={settings}
  isLoading={isLoading}
  sortColumn={sortColumn}
  sortOrder={sortOrder}
  onSort={handleSort}
  onColumnsReorder={isOwner ? handleColumnsReorder : undefined}  // Only owners can reorder
/>
```

#### Update Filter Options to Use localColumns

Change references from `columns` to `localColumns` for the filter options computation to stay in sync.

---

## Behavior Summary

| Action | Result |
|--------|--------|
| Hover column header | Drag handle icon appears (opacity transition) |
| Click column header | Triggers sort (stopPropagation prevents drag) |
| Drag column header | Horizontal reorder with opacity feedback |
| Release column | New order applied locally immediately |
| 1 second after last drag | Auto-save to database with toast confirmation |
| Non-owner users | No drag handles shown (reorder disabled) |

---

## Visual Feedback

| State | Styling |
|-------|---------|
| Normal | Drag handle hidden (opacity-0) |
| Hover | Drag handle visible (opacity-100) |
| Dragging | Column 50% opacity, muted background |
| Drop complete | Smooth transition to new position |

---

## Technical Notes

- Uses `horizontalListSortingStrategy` for horizontal reordering
- 8px activation constraint prevents accidental drags
- Debounce pattern avoids excessive database writes during rapid reordering
- Local state ensures immediate UI feedback while save is pending
- Only owners can reorder (callback is undefined for members)
- Toast notification confirms save after debounce completes

