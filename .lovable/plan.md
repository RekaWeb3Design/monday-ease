

# Add Drag-and-Drop Column Reordering to CreateViewDialog

## Overview

Add drag-and-drop functionality to Step 3 (Column Configuration) of the CreateViewDialog, allowing users to reorder their selected columns visually. This uses the @dnd-kit library for smooth, accessible drag-and-drop interactions.

---

## Installation Required

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## File to Modify

**`src/components/board-views/CreateViewDialog.tsx`**

---

## Implementation Details

### 1. Add New Imports

Add the following imports at the top of the file:

```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

Note: `GripVertical` is already imported from lucide-react.

---

### 2. Create SortableColumnItem Component

Add a new internal component for draggable column items:

```typescript
function SortableColumnItem({
  column,
  isSelected,
  selectedCol,
  onToggle,
  onWidthChange,
}: {
  column: MondayColumn;
  isSelected: boolean;
  selectedCol?: ViewColumn;
  onToggle: (checked: boolean) => void;
  onWidthChange: (width: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.id, 
    disabled: !isSelected  // Only draggable when selected
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md transition-colors",
        isSelected && "bg-primary/5",
        isDragging && "opacity-50 border border-primary shadow-sm"
      )}
    >
      {/* Drag handle - only visible when selected */}
      {isSelected && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      
      <Checkbox
        id={column.id}
        checked={isSelected}
        onCheckedChange={onToggle}
      />
      
      <div className="flex-1">
        <label
          htmlFor={column.id}
          className="text-sm font-medium cursor-pointer"
        >
          {column.title}
        </label>
        <p className="text-xs text-muted-foreground">
          Type: {column.type}
        </p>
      </div>
      
      {isSelected && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Width:</Label>
          <Input
            type="number"
            value={selectedCol?.width || 150}
            onChange={(e) => onWidthChange(parseInt(e.target.value) || 150)}
            className="w-16 h-7 text-xs"
            min={50}
            max={500}
          />
        </div>
      )}
    </div>
  );
}
```

---

### 3. Add Sensors and Drag Handler

Inside the `CreateViewDialog` component, add:

```typescript
// Drag-and-drop sensors
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Prevent accidental drags
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// Handle drag end event
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over && active.id !== over.id) {
    setSelectedColumns((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
};
```

---

### 4. Create Sorted Column List

Compute the display order for columns (selected first, then unselected):

```typescript
// Get columns in display order: selected columns first (in their order), then unselected
const sortedBoardColumns = [...boardColumns].sort((a, b) => {
  const aIndex = selectedColumns.findIndex(c => c.id === a.id);
  const bIndex = selectedColumns.findIndex(c => c.id === b.id);
  
  // Both selected: maintain selectedColumns order
  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  // Only a selected: a comes first
  if (aIndex !== -1) return -1;
  // Only b selected: b comes first
  if (bIndex !== -1) return 1;
  // Neither selected: maintain original order
  return 0;
});
```

---

### 5. Update Step 3 Render (case 3)

Replace the current Step 3 column list with the DnD-wrapped version:

```tsx
case 3:
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Columns to Display *</Label>
        <p className="text-sm text-muted-foreground">
          Choose columns and drag to reorder selected ones
        </p>
      </div>
      <ScrollArea className="h-[300px] rounded-md border p-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedColumns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedBoardColumns.map((column) => {
                const isSelected = selectedColumns.some(c => c.id === column.id);
                const selectedCol = selectedColumns.find(c => c.id === column.id);

                return (
                  <SortableColumnItem
                    key={column.id}
                    column={column}
                    isSelected={isSelected}
                    selectedCol={selectedCol}
                    onToggle={(checked) => handleColumnToggle(column, checked)}
                    onWidthChange={(width) => handleColumnWidthChange(column.id, width)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
      <p className="text-sm text-muted-foreground">
        {selectedColumns.length} column{selectedColumns.length !== 1 ? "s" : ""} selected
        {selectedColumns.length > 1 && " • Drag to reorder"}
      </p>
    </div>
  );
```

---

## Visual Behavior

| State | Visual Feedback |
|-------|-----------------|
| Selected column | Light primary background, drag handle visible |
| Dragging | 50% opacity, primary border, slight shadow |
| Unselected | Normal styling, no drag handle |
| Drop target | Smooth transition animation |

---

## UI Layout (Step 3)

```text
+----------------------------------------+
| Select Columns to Display *            |
| Choose columns and drag to reorder     |
+----------------------------------------+
| ⠿ ☑ Status          Type: status [150]|  ← Selected (draggable)
| ⠿ ☑ Priority        Type: dropdown[120]|  ← Selected (draggable)
| ⠿ ☑ Due Date        Type: date   [150]|  ← Selected (draggable)
|   ☐ Owner           Type: people       |  ← Unselected (not draggable)
|   ☐ Created         Type: date         |  ← Unselected (not draggable)
+----------------------------------------+
| 3 columns selected • Drag to reorder   |
+----------------------------------------+
```

---

## Changes Summary

| Location | Change |
|----------|--------|
| Imports | Add @dnd-kit imports |
| New component | `SortableColumnItem` for individual draggable items |
| New variables | `sensors`, `sortedBoardColumns` |
| New function | `handleDragEnd` for reorder logic |
| Step 3 render | Wrap with `DndContext` and `SortableContext` |
| Helper text | Updated to mention drag-to-reorder |

---

## Accessibility

The implementation includes:
- Keyboard support via `KeyboardSensor`
- ARIA attributes via `useSortable`
- Focus management for screen readers
- Activation constraint to prevent accidental drags

