import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { AvatarStack } from "./AvatarStack";
import { useDemoDashboard } from "./DemoDashboardContext";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

export function TimelineTab() {
  const { filteredTasks, openTaskDetail } = useDemoDashboard();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = format(today, "yyyy-MM-dd");

  const sorted = [...filteredTasks].sort(
    (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()
  );

  let prevDate = "";

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-6">Projekt idővonal</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nincs találat a szűrési feltételeknek megfelelően.</p>
      ) : (
        <div className="space-y-0">
          {sorted.map((task, i) => {
            const taskDate = task.due;
            const isNewDate = taskDate !== prevDate;
            prevDate = taskDate;

            const isDone = task.status === "Kész";
            const isOverdue = new Date(task.due) < today && !isDone;
            const isToday = taskDate === todayStr;
            const isLast = i === sorted.length - 1;

            return (
              <div key={task.name} className="flex">
                <div className="w-24 text-right pr-4 pt-2.5 shrink-0">
                  {isNewDate && (
                    <span className={`text-xs font-medium ${isToday ? "text-blue-600 font-bold" : isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                      {isToday ? "📍 MA" : format(new Date(taskDate), "MMM dd.", { locale: hu })}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 mt-3 ${isDone ? "bg-green-500 border-green-500" : isOverdue ? "bg-card border-destructive" : "bg-card border-blue-500"}`} />
                  {!isLast && <div className="w-0.5 bg-border flex-1 min-h-[8px]" />}
                </div>
                <div className="flex-1 pl-4 pb-2">
                  <div
                    className={`rounded-lg py-2.5 px-4 mb-1 flex items-center justify-between gap-3 flex-wrap cursor-pointer hover:opacity-80 transition-opacity ${isOverdue ? "bg-red-50" : isDone ? "bg-green-50" : "bg-muted/50"}`}
                    onClick={() => openTaskDetail(task)}
                  >
                    <span className="text-sm font-medium text-foreground">{task.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <AvatarStack assignees={task.assignees} />
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
