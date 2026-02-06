import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MondayTask, MondayColumnValue } from "@/types";

interface TaskCardProps {
  task: MondayTask;
  showBoardName?: boolean;
}

// Get status badge color based on status text
function getStatusColor(statusText: string): string {
  const lower = statusText.toLowerCase();
  
  if (lower.includes("done") || lower.includes("complete")) {
    return "bg-[#01cb72] text-white hover:bg-[#01cb72]/90";
  }
  if (lower.includes("stuck") || lower.includes("block")) {
    return "bg-[#fb275d] text-white hover:bg-[#fb275d]/90";
  }
  if (lower.includes("progress") || lower.includes("working")) {
    return "bg-[#ffcd03] text-black hover:bg-[#ffcd03]/90";
  }
  
  return "bg-muted text-muted-foreground";
}

// Check if column is a status type
function isStatusColumn(col: MondayColumnValue): boolean {
  return col.type === "status" || col.type === "color";
}

// Extract color from column value's label_style
function getColumnColor(col: MondayColumnValue): string | null {
  if (typeof col.value === "object" && col.value?.label_style?.color) {
    return col.value.label_style.color;
  }
  return null;
}

// Format column value for display
function formatColumnValue(col: MondayColumnValue): string {
  if (col.text) return col.text;
  if (col.value === null) return "-";
  if (typeof col.value === "object") {
    return JSON.stringify(col.value);
  }
  return String(col.value);
}

export function TaskCard({ task, showBoardName = true }: TaskCardProps) {
  // Find the status column
  const statusCol = task.column_values.find(isStatusColumn);
  const statusText = statusCol?.text || null;
  
  // Get non-status columns for display (limit to first 4)
  const displayColumns = task.column_values
    .filter((col) => !isStatusColumn(col) && col.text)
    .slice(0, 4);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
            {task.name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {showBoardName && (
            <Badge variant="outline" className="text-xs">
              {task.board_name}
            </Badge>
          )}
          {statusCol && statusText && (() => {
            const labelColor = getColumnColor(statusCol);
            return (
              <Badge 
                className={`text-xs ${!labelColor ? getStatusColor(statusText) : ''}`}
                style={labelColor ? {
                  backgroundColor: labelColor,
                  color: 'white',
                  border: 'none',
                } : undefined}
              >
                {statusText}
              </Badge>
            );
          })()}
        </div>
      </CardHeader>
      
      {displayColumns.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {displayColumns.map((col) => (
              <div key={col.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">
                  {col.title}:
                </span>
                <span className="truncate">
                  {formatColumnValue(col)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
