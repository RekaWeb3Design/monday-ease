import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
}

export function ViewDataTable({
  columns,
  items,
  settings,
  isLoading,
  sortColumn,
  sortOrder,
  onSort,
}: ViewDataTableProps) {
  const rowHeightClass = {
    compact: "h-10",
    default: "h-12",
    comfortable: "h-14",
  }[settings.row_height] || "h-12";

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

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
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
            ))}
          </TableRow>
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
