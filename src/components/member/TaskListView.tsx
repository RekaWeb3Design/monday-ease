import { Badge } from "@/components/ui/badge";
import type { MondayTask, MondayColumnValue } from "@/types";

interface TaskListViewProps {
  tasks: MondayTask[];
  showBoardName: boolean;
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

export function TaskListView({ tasks, showBoardName }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  // Get all unique columns from all tasks
  const allColumns = tasks.reduce((acc, task) => {
    task.column_values.forEach((col) => {
      if (!acc.find((c) => c.id === col.id)) {
        acc.push({ id: col.id, title: col.title, type: col.type });
      }
    });
    return acc;
  }, [] as { id: string; title: string; type: string }[]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left font-semibold text-muted-foreground uppercase text-xs py-3 px-4">
              Name
            </th>
            {showBoardName && (
              <th className="text-left font-semibold text-muted-foreground uppercase text-xs py-3 px-4">
                Board
              </th>
            )}
            {allColumns.map((col) => (
              <th
                key={col.id}
                className={`font-semibold text-muted-foreground uppercase text-xs py-3 px-4
                  ${col.type === "numbers" ? "text-right" : "text-left"}`}
              >
                {col.title}
              </th>
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
