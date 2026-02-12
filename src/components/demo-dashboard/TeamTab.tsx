import { useMemo } from "react";
import { TEAM_MEMBERS } from "@/data/demoData";
import { StatusBadge } from "./StatusBadge";
import { useDemoDashboard } from "./DemoDashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfWeek, addDays, format } from "date-fns";

const PRIORITY_WEIGHTS: Record<string, number> = {
  "Kritikus": 4, "Magas": 3, "Közepes": 2, "Alacsony": 1,
};

const WEEKDAY_LABELS = ["H", "K", "Sz", "Cs", "P"];

function getWorkloadColor(pct: number) {
  if (pct < 40) return { color: "#00CA72", label: "Könnyű" };
  if (pct <= 70) return { color: "#FDAB3D", label: "Közepes" };
  return { color: "#E2445C", label: "Túlterhelt" };
}

export function TeamTab() {
  const { filteredTasks, openTaskDetail } = useDemoDashboard();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, []);

  const memberData = useMemo(() => {
    return TEAM_MEMBERS.map((member) => {
      const tasks = filteredTasks.filter((t) => t.assignees.includes(member.name));
      const activeTasks = tasks.filter((t) => t.status !== "Kész");
      const done = tasks.filter((t) => t.status === "Kész").length;
      const active = tasks.filter((t) => t.status === "Folyamatban").length;
      const overdue = tasks.filter((t) => new Date(t.due) < today && t.status !== "Kész").length;
      const attention = tasks.filter(
        (t) => t.status === "Elakadt" || (new Date(t.due) < today && t.status !== "Kész")
      ).length;

      const workloadScore = Math.min(
        100,
        activeTasks.reduce((sum, t) => sum + (PRIORITY_WEIGHTS[t.priority] || 1), 0) / 5 * 100
      );

      const weekCounts = weekDays.map((day) => tasks.filter((t) => t.due === day).length);

      return { member, tasks, done, active, attention, overdue, workloadScore, weekCounts, activeCount: activeTasks.length };
    });
  }, [filteredTasks, weekDays]);

  // Team summary
  const avgWorkload = memberData.length > 0
    ? Math.round(memberData.reduce((s, m) => s + m.workloadScore, 0) / memberData.length)
    : 0;
  const mostTasks = memberData.reduce((max, m) => m.tasks.length > max.tasks.length ? m : max, memberData[0]);
  const needsAttention = memberData.filter((m) => m.attention > 0);
  const avgWlInfo = getWorkloadColor(avgWorkload);

  return (
    <div className="space-y-5">
      {/* Team summary */}
      <Card className="rounded-xl shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">👥 Csapat összefoglaló</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: avgWlInfo.color }}>{avgWorkload}%</p>
              <p className="text-xs text-muted-foreground">Átlagos terhelés</p>
              <p className="text-[10px] font-medium" style={{ color: avgWlInfo.color }}>{avgWlInfo.label}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{mostTasks?.member.name.split(" ")[0] ?? "-"}</p>
              <p className="text-xs text-muted-foreground">Legtöbb feladat</p>
              <p className="text-[10px] text-muted-foreground">{mostTasks?.tasks.length ?? 0} feladat</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{needsAttention.length}</p>
              <p className="text-xs text-muted-foreground">Figyelmet igényel</p>
              <p className="text-[10px] text-muted-foreground">
                {needsAttention.length > 0
                  ? needsAttention.map((m) => m.member.name.split(" ")[0]).join(", ")
                  : "Mindenki rendben"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {memberData.map(({ member, tasks, done, active, attention, workloadScore, weekCounts, activeCount, overdue }) => {
          const wl = getWorkloadColor(workloadScore);
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

              {/* Workload bar */}
              <div className="px-5 pb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium" style={{ color: wl.color }}>{wl.label}</span>
                  <span className="text-[10px] text-muted-foreground">{activeCount} aktív, {overdue} lejárt</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${workloadScore}%`, backgroundColor: wl.color }}
                  />
                </div>
              </div>

              {/* Weekly mini chart */}
              <div className="px-5 py-2 flex items-end gap-1.5">
                {weekCounts.map((count, idx) => {
                  const bg = count === 0 ? "bg-muted" : count === 1 ? "bg-blue-200" : count === 2 ? "bg-blue-400" : "bg-blue-600";
                  return (
                    <div key={idx} className="flex flex-col items-center gap-0.5 flex-1">
                      <div className={`w-full h-6 rounded ${bg}`} />
                      <span className="text-[9px] text-muted-foreground">{WEEKDAY_LABELS[idx]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Task list */}
              <div className="px-5 pb-5 max-h-48 overflow-y-auto space-y-1.5">
                {tasks.map((task) => (
                  <div
                    key={task.name}
                    className="bg-muted/50 rounded-lg p-2 text-xs flex justify-between items-center gap-2 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => openTaskDetail(task)}
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
    </div>
  );
}
