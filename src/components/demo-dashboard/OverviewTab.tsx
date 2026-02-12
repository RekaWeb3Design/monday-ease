import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllTasks, STATUS_OPTIONS, getStatusColor } from "@/data/demoData";
import { StatusBadge } from "./StatusBadge";
import { AvatarStack } from "./AvatarStack";
import { useMemo } from "react";

export function OverviewTab() {
  const tasks = getAllTasks();
  const today = new Date();

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "Kész").length;
    const inProgress = tasks.filter((t) => t.status === "Folyamatban").length;
    const stuck = tasks.filter((t) => t.status === "Elakadt").length;
    const overdue = tasks.filter((t) => new Date(t.due) < today && t.status !== "Kész").length;
    return { done, inProgress, stuck, overdue };
  }, [tasks]);

  const statusCounts = useMemo(() => {
    return STATUS_OPTIONS.map((s) => ({
      ...s,
      count: tasks.filter((t) => t.status === s.label).length,
    })).filter((s) => s.count > 0);
  }, [tasks]);

  const attentionTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.status === "Elakadt" || (new Date(t.due) < today && t.status !== "Kész")
    );
  }, [tasks]);

  const statCards = [
    { label: "Összes feladat", count: tasks.length, icon: "📋", sub: "4 csoport", accent: "hsl(var(--muted-foreground))" },
    { label: "Elkészült", count: stats.done, icon: "✅", sub: `${Math.round((stats.done / tasks.length) * 100)}%`, accent: "#00CA72" },
    { label: "Folyamatban", count: stats.inProgress, icon: "🔄", sub: "aktív sprint", accent: "#FDAB3D" },
    { label: "Elakadt", count: stats.stuck, icon: "⚠️", sub: "figyelmet igényel", accent: "#E2445C" },
    { label: "Lejárt", count: stats.overdue, icon: "⏰", sub: "határidő túllépés", accent: "#E2445C" },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-xl shadow-sm border-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: card.accent }}>{card.count}</p>
              <p className="text-sm font-medium text-foreground mt-1">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Status distribution */}
      <Card className="rounded-xl shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Státusz eloszlás</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-10 rounded-lg overflow-hidden">
            {statusCounts.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-center text-white text-xs font-medium transition-all"
                style={{
                  backgroundColor: s.color,
                  width: `${(s.count / tasks.length) * 100}%`,
                }}
              >
                {s.count}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {statusCounts.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} ({s.count})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Attention items */}
      {attentionTasks.length > 0 && (
        <Card className="rounded-xl shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔥 Figyelmet igénylő feladatok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {attentionTasks.map((task) => (
              <div
                key={task.name}
                className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={task.status} />
                  <span className="text-sm font-medium truncate">{task.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <AvatarStack assignees={task.assignees} />
                  <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                    ⚠️ {new Date(task.due).toLocaleDateString("hu-HU")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
