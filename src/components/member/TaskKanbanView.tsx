import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { MondayTask } from "@/types";

interface Props {
  tasks: MondayTask[];
  showBoardName: boolean;
}

interface StatusGroup {
  status: string;
  color: string;
  tasks: MondayTask[];
}

export function TaskKanbanView({ tasks, showBoardName }: Props) {
  const columns = useMemo(() => {
    const map = new Map<string, StatusGroup>();

    tasks.forEach((t) => {
      const col = t.column_values.find((c) => c.type === "status" || c.type === "color");
      const status = col?.text || "No Status";
      const color = col?.value?.label_style?.color || "#C4C4C4";

      if (!map.has(status)) {
        map.set(status, { status, color, tasks: [] });
      }
      map.get(status)!.tasks.push(t);
    });

    return Array.from(map.values());
  }, [tasks]);

  const getTypeAndDate = (task: MondayTask) => {
    const typeCol = task.column_values.find((c) => c.title.toLowerCase().includes("type"));
    const dateCol = task.column_values.find((c) => c.type === "date");
    return {
      type: typeCol?.text || null,
      date: dateCol?.text || null,
    };
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4 snap-x snap-mandatory animate-in fade-in duration-300">
      <div className="flex gap-4" style={{ minWidth: columns.length * 296 }}>
        {columns.map((col) => (
          <div
            key={col.status}
            className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-lg snap-start"
            style={{ backgroundColor: "#F9FAFB" }}
          >
            {/* Column header */}
            <div
              className="px-3 py-2.5 rounded-t-lg flex items-center justify-between"
              style={{ backgroundColor: `${col.color}18` }}
            >
              <span className="text-sm font-semibold" style={{ color: col.color }}>
                {col.status}
              </span>
              <Badge
                variant="secondary"
                className="text-xs h-5 min-w-[20px] justify-center"
                style={{ backgroundColor: `${col.color}25`, color: col.color }}
              >
                {col.tasks.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
              {col.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
              ) : (
                col.tasks.map((task) => {
                  const { type, date } = getTypeAndDate(task);
                  return (
                    <div
                      key={task.id}
                      className="bg-background rounded-md shadow-sm p-3 border-l-[3px]"
                      style={{ borderLeftColor: col.color }}
                    >
                      <p className="text-sm font-medium leading-snug">{task.name}</p>
                      {showBoardName && (
                        <p className="text-xs text-muted-foreground mt-1">{task.board_name}</p>
                      )}
                      {(type || date) && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {type && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {type}
                            </span>
                          )}
                          {date && (
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                try { return format(new Date(date), "MMM dd"); }
                                catch { return date; }
                              })()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
