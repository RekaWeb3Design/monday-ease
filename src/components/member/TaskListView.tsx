import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { MondayTask, MondayColumnValue } from "@/types";

interface TaskListViewProps {
  tasks: MondayTask[];
  showBoardName: boolean;
  allColumns: { id: string; title: string; type: string }[];
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  onSort: (columnId: string) => void;
}

// Check if column is a status type
function isStatusColumn(type: string): boolean {
  return type === "status" || type === "color";
}

// Extract color from column value's label_style
function getColumnColor(col: MondayColumnValue): string | null {
  if (typeof col.value === "object" && col.value?.label_style?.color) {
    return col.value.label_style.color;
  }
  return null;
}

export function TaskListView({ 
  tasks, 
  showBoardName, 
  allColumns,
  sortColumn,
  sortDirection,
  onSort 
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  // Sortable header component
  const SortableHeader = ({ 
    columnId, 
    children, 
    className = "" 
  }: { 
    columnId: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <th
      className={`font-semibold text-muted-foreground uppercase text-xs py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors ${className}`}
      onClick={() => onSort(columnId)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === columnId && (
          sortDirection === "asc" 
            ? <ChevronUp className="h-3 w-3" /> 
            : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <SortableHeader columnId="name" className="text-left">
              Name
            </SortableHeader>
            {showBoardName && (
              <SortableHeader columnId="board" className="text-left">
                Board
              </SortableHeader>
            )}
            {allColumns.map((col) => (
              <SortableHeader 
                key={col.id} 
                columnId={col.id}
                className={col.type === "numbers" ? "text-right" : "text-left"}
              >
                {col.title}
              </SortableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr
              key={task.id}
              className={`border-b border-border hover:bg-muted/50 transition-colors
                ${index % 2 === 1 ? "bg-muted/30" : "bg-background"}`}
            >
              {/* Task name */}
              <td className="py-3 px-4 font-medium text-foreground max-w-[300px] truncate">
                {task.name}
              </td>

              {/* Board name badge */}
              {showBoardName && (
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">
                    {task.board_name}
                  </Badge>
                </td>
              )}

              {/* Dynamic columns */}
              {allColumns.map((colDef) => {
                const col = task.column_values.find((c) => c.id === colDef.id);
                const labelColor = col ? getColumnColor(col) : null;

                return (
                  <td
                    key={colDef.id}
                    className={`py-3 px-4 ${colDef.type === "numbers" ? "text-right" : ""}`}
                  >
                    {isStatusColumn(colDef.type) && col?.text ? (
                      <Badge
                        className="text-xs"
                        style={
                          labelColor
                            ? { backgroundColor: labelColor, color: "white", border: "none" }
                            : undefined
                        }
                      >
                        {col.text}
                      </Badge>
                    ) : (
                      <span className={`${col?.text ? "text-foreground" : "text-muted-foreground"} text-sm max-w-[200px] truncate block`}>
                        {col?.text || "—"}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
