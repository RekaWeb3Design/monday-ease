import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ColumnCell } from "./ColumnCell";
import type { ViewColumn, ViewDataItem, ViewSettings } from "@/types";
import { cn } from "@/lib/utils";

interface ViewDataTableProps {
  columns: ViewColumn[];
  items: ViewDataItem[];
  settings: ViewSettings;
  isLoading: boolean;
  sortColumn: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (columnId: string) => void;
  onColumnsReorder?: (newColumns: ViewColumn[]) => void;
}

// Sortable header component for drag-and-drop
function SortableHeader({
  column,
  sortColumn,
  sortOrder,
  onSort,
}: {
  column: ViewColumn;
  sortColumn: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: () => void;
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

  const SortIcon = () => {
    if (sortColumn !== column.id) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
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
          <SortIcon />
        </Button>
      </div>
    </TableHead>
  );
}

export function ViewDataTable({
  columns,
  items,
  settings,
  isLoading,
  sortColumn,
  sortOrder,
  onSort,
  onColumnsReorder,
}: ViewDataTableProps) {
  const rowHeightClass = {
    compact: "h-10",
    default: "h-12",
    comfortable: "h-14",
  }[settings.row_height] || "h-12";

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

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {settings.show_item_name && (
                <TableHead className="w-[200px]">
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.id} style={{ width: col.width || 150 }}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className={rowHeightClass}>
                {settings.show_item_name && (
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">No items found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 hover:bg-transparent"
                      onClick={() => onSort('name')}
                    >
                      Item Name
                      <SortIcon columnId="name" />
                    </Button>
                  </TableHead>
                )}
                {columns.map((col) => (
                  onColumnsReorder ? (
                    <SortableHeader
                      key={col.id}
                      column={col}
                      sortColumn={sortColumn}
                      sortOrder={sortOrder}
                      onSort={() => onSort(col.id)}
                    />
                  ) : (
                    <TableHead
                      key={col.id}
                      style={{ width: col.width || 150, minWidth: col.width || 100 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 hover:bg-transparent"
                        onClick={() => onSort(col.id)}
                      >
                        {col.title}
                        <SortIcon columnId={col.id} />
                      </Button>
                    </TableHead>
                  )
                ))}
              </TableRow>
            </SortableContext>
          </DndContext>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={cn(rowHeightClass)}>
              {settings.show_item_name && (
                <TableCell className="font-medium">
                  {item.name}
                </TableCell>
              )}
              {columns.map((col) => {
                const cellValue = item.column_values[col.id];
                return (
                  <TableCell key={col.id}>
                    {cellValue ? (
                      <ColumnCell
                        type={cellValue.type || col.type}
                        text={cellValue.text}
                        value={cellValue.value}
                        label={cellValue.label}
                        labelStyle={cellValue.label_style as { color?: string } | undefined}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
