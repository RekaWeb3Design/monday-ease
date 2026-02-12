import { TEAM_MEMBERS, getAllTasks } from "@/data/demoData";
import { StatusBadge } from "./StatusBadge";

export function TeamTab() {
  const allTasks = getAllTasks();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {TEAM_MEMBERS.map((member) => {
        const tasks = allTasks.filter((t) => t.assignees.includes(member.name));
        const done = tasks.filter((t) => t.status === "Kész").length;
        const active = tasks.filter((t) => t.status === "Folyamatban").length;
        const attention = tasks.filter(
          (t) => t.status === "Elakadt" || (new Date(t.due) < today && t.status !== "Kész")
        ).length;

        return (
          <div
            key={member.name}
            className="bg-card rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow overflow-hidden"
            style={{ borderTopWidth: 3, borderTopColor: member.color }}
          >
            {/* Header */}
            <div className="p-5 pb-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {member.initials}
              </div>
              <div>
                <p className="font-bold text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="px-5 pb-3 grid grid-cols-4 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-foreground">{tasks.length}</p>
                <p className="text-[10px] text-muted-foreground">Összes</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">{done}</p>
                <p className="text-[10px] text-green-600">Kész</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-yellow-600">{active}</p>
                <p className="text-[10px] text-yellow-600">Aktív</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-600">{attention}</p>
                <p className="text-[10px] text-red-600">Figyel!</p>
              </div>
            </div>

            {/* Task list */}
            <div className="px-5 pb-5 max-h-48 overflow-y-auto space-y-1.5">
              {tasks.map((task) => (
                <div
                  key={task.name}
                  className="bg-muted/50 rounded-lg p-2 text-xs flex justify-between items-center gap-2"
                >
                  <span className="truncate text-foreground">{task.name}</span>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
