import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDemoDashboard } from "./DemoDashboardContext";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressBar } from "./ProgressBar";
import { getMember } from "@/data/demoData";
import { useMemo } from "react";

const SUBTASK_TEMPLATES: Record<string, string[]> = {
  Backend: ["Endpoint tervezés", "Auth implementálás", "Adatbázis migráció", "Unit tesztek", "Code review", "Dokumentáció", "Integrációs tesztek", "API validáció"],
  Frontend: ["UI design", "Komponens fejlesztés", "Reszponzív nézet", "Tesztelés", "Akadálymentesítés", "Animációk", "Code review", "Böngésző teszt"],
  QA: ["Teszt terv készítés", "Teszt esetek írása", "Automatizálás", "Regressziós teszt", "Jelentés készítés", "Bug riport", "Újra tesztelés", "Elfogadási teszt"],
  Projekt: ["Követelmény egyeztetés", "Terv jóváhagyás", "Fejlesztés indítás", "Progress review", "Ügyfél demo", "Visszajelzés feldolgozás", "Végső átadás", "Dokumentáció"],
  DevOps: ["Pipeline konfig", "Build teszt", "Deploy script", "Monitoring beállítás", "Rollback terv", "Éles deploy"],
  Docs: ["Struktúra tervezés", "Tartalom írás", "Review", "Példák hozzáadása", "Formázás", "Publikálás"],
  Folyamat: ["Sablon készítés", "Csapat egyeztetés", "Véglegesítés", "Bevezetés"],
};

function generateSubtasks(task: { category: string; subtasksTotal: number; subtasksDone: number }) {
  const templates = SUBTASK_TEMPLATES[task.category] ?? SUBTASK_TEMPLATES["Projekt"];
  const names = templates.slice(0, task.subtasksTotal);
  return names.map((name, i) => ({ name, done: i < task.subtasksDone }));
}

const ACTIVITY_TEMPLATES = [
  { action: "módosította a státuszt", time: "2 napja" },
  { action: "hozzáadott egy kommentet", time: "3 napja" },
  { action: "frissítette a haladást", time: "5 napja" },
  { action: "létrehozta a feladatot", time: "1 hete" },
];

export function TaskDetailPanel() {
  const { selectedTask, isDetailOpen, closeTaskDetail } = useDemoDashboard();

  const today = new Date();

  const dueInfo = useMemo(() => {
    if (!selectedTask) return null;
    const dueDate = new Date(selectedTask.due);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = dueDate < today && selectedTask.status !== "Kész";
    return { dueDate, diffDays, isOverdue };
  }, [selectedTask]);

  const subtasks = useMemo(() => {
    if (!selectedTask) return [];
    return generateSubtasks(selectedTask);
  }, [selectedTask]);

  const activities = useMemo(() => {
    if (!selectedTask) return [];
    const assignees = selectedTask.assignees;
    return ACTIVITY_TEMPLATES.slice(0, Math.min(4, assignees.length + 2)).map((tmpl, i) => ({
      ...tmpl,
      person: assignees[i % assignees.length],
    }));
  }, [selectedTask]);

  if (!selectedTask) return null;

  return (
    <Sheet open={isDetailOpen} onOpenChange={(open) => !open && closeTaskDetail()}>
      <SheetContent className="w-[420px] sm:w-[420px] overflow-y-auto" side="right">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg leading-tight pr-6">{selectedTask.name}</SheetTitle>
          <span className="text-[10px] bg-gray-100 text-muted-foreground rounded px-1.5 py-0.5 w-fit">
            {selectedTask.category}
          </span>
        </SheetHeader>

        {/* Section 1: Részletek */}
        <div className="py-5 border-b space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Részletek</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Státusz</p>
              <StatusBadge status={selectedTask.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prioritás</p>
              <PriorityBadge priority={selectedTask.priority} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Határidő</p>
            <p className="text-sm font-medium">
              {dueInfo?.dueDate.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
              {dueInfo?.isOverdue && (
                <span className="ml-2 text-red-600 text-xs font-semibold">⚠️ Lejárt!</span>
              )}
              {!dueInfo?.isOverdue && selectedTask.status !== "Kész" && dueInfo && dueInfo.diffDays >= 0 && (
                <span className="ml-2 text-green-600 text-xs">{dueInfo.diffDays} nap van hátra</span>
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Felelősök</p>
            <div className="space-y-2">
              {selectedTask.assignees.map((name) => {
                const member = getMember(name);
                return (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: member?.color ?? "#C4C4C4" }}
                    >
                      {member?.initials ?? "?"}
                    </div>
                    <span className="text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground">{member?.role}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2: Haladás */}
        <div className="py-5 border-b space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Haladás</h3>
          <div className="[&_div:first-child]:h-3">
            <ProgressBar value={selectedTask.progress} />
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedTask.subtasksDone}/{selectedTask.subtasksTotal} alfeladat kész
          </p>
          <div className="space-y-1.5">
            {subtasks.map((st) => (
              <div key={st.name} className="flex items-center gap-2 text-sm">
                {st.done ? (
                  <span className="text-green-600">☑</span>
                ) : (
                  <span className="text-gray-400">☐</span>
                )}
                <span className={st.done ? "line-through text-muted-foreground" : ""}>{st.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Aktivitás */}
        <div className="py-5 space-y-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Aktivitás</h3>
          {activities.map((act, i) => {
            const member = getMember(act.person);
            return (
              <div key={i} className="flex gap-3 relative">
                {/* Vertical line */}
                {i < activities.length - 1 && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200" />
                )}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 z-10"
                  style={{ backgroundColor: member?.color ?? "#C4C4C4" }}
                >
                  {member?.initials ?? "?"}
                </div>
                <div className="pb-4">
                  <p className="text-sm">
                    <span className="font-medium">{act.person}</span>{" "}
                    <span className="text-muted-foreground">{act.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{act.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
