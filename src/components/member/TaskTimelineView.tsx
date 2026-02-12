import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CalendarDays, ChevronDown, ChevronRight, Clock } from "lucide-react";
import {
  isPast, isToday, isTomorrow, isThisWeek, startOfWeek, addWeeks,
  isBefore, format,
} from "date-fns";
import type { MondayTask } from "@/types";

interface Props {
  tasks: MondayTask[];
  showBoardName: boolean;
}

interface Section {
  key: string;
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  tasks: (MondayTask & { _date: Date | null })[];
}

export function TaskTimelineView({ tasks, showBoardName }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // Find date column id
  const dateColId = useMemo(() => {
    for (const t of tasks) {
      const dc = t.column_values.find((c) => c.type === "date");
      if (dc) return dc.id;
    }
    return null;
  }, [tasks]);

  const sections = useMemo(() => {
    if (!dateColId && tasks.length > 0) return null; // no date column

    const now = new Date();
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const weekAfterNext = startOfWeek(addWeeks(now, 2), { weekStartsOn: 1 });

    const buckets: Record<string, Section> = {};

    const ensure = (key: string, label: string, icon: React.ReactNode, bgClass: string, borderClass: string) => {
      if (!buckets[key]) buckets[key] = { key, label, icon, bgClass, borderClass, tasks: [] };
    };

    // Pre-create ordered buckets
    ensure("overdue", "Overdue", <AlertTriangle className="h-4 w-4" />, "bg-red-50", "border-l-red-400");
    ensure("this-week", "This Week", <Clock className="h-4 w-4" />, "bg-yellow-50", "border-l-yellow-400");
    ensure("next-week", "Next Week", <CalendarDays className="h-4 w-4" />, "bg-green-50", "border-l-green-400");

    const laterWeeks = new Map<string, string>(); // weekKey → label

    const noDeadline: (MondayTask & { _date: Date | null })[] = [];

    tasks.forEach((t) => {
      const cv = dateColId ? t.column_values.find((c) => c.id === dateColId) : null;
      if (!cv?.text) {
        noDeadline.push({ ...t, _date: null });
        return;
      }
      let d: Date;
      try {
        d = new Date(cv.text);
        if (isNaN(d.getTime())) { noDeadline.push({ ...t, _date: null }); return; }
      } catch {
        noDeadline.push({ ...t, _date: null });
        return;
      }

      const augTask = { ...t, _date: d };

      if (isPast(d) && !isToday(d) && !isThisWeek(d, { weekStartsOn: 1 })) {
        buckets["overdue"].tasks.push(augTask);
      } else if (isThisWeek(d, { weekStartsOn: 1 })) {
        buckets["this-week"].tasks.push(augTask);
      } else if (isBefore(d, weekAfterNext)) {
        buckets["next-week"].tasks.push(augTask);
      } else {
        const ws = startOfWeek(d, { weekStartsOn: 1 });
        const wk = ws.toISOString();
        if (!laterWeeks.has(wk)) {
          laterWeeks.set(wk, `Week of ${format(ws, "MMM dd")}`);
        }
        ensure(wk, laterWeeks.get(wk)!, <CalendarDays className="h-4 w-4" />, "bg-muted/50", "border-l-muted-foreground/30");
        buckets[wk].tasks.push(augTask);
      }
    });

    // Sort tasks within each bucket by date
    Object.values(buckets).forEach((s) =>
      s.tasks.sort((a, b) => (a._date?.getTime() || 0) - (b._date?.getTime() || 0))
    );

    // Build ordered list
    const ordered = ["overdue", "this-week", "next-week"];
    const later = Array.from(laterWeeks.keys()).sort();
    const result = [...ordered, ...later]
      .map((k) => buckets[k])
      .filter(Boolean);

    if (noDeadline.length > 0) {
      result.push({
        key: "no-deadline",
        label: "No Deadline",
        icon: <CalendarDays className="h-4 w-4" />,
        bgClass: "bg-muted/30",
        borderClass: "border-l-muted-foreground/20",
        tasks: noDeadline,
      });
    }

    return result;
  }, [tasks, dateColId]);

  if (sections === null) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 animate-in fade-in duration-300">
        <CalendarDays className="h-8 w-8" />
        <p className="text-sm">No deadline column configured for this board</p>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground animate-in fade-in duration-300">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {sections.map((section) => {
        const isOpen = collapsed[section.key] !== true; // default open
        return (
          <Collapsible key={section.key} open={isOpen} onOpenChange={() => toggle(section.key)}>
            <CollapsibleTrigger asChild>
              <button
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${section.bgClass}`}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {section.icon}
                <span>{section.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {section.tasks.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-1">
                {section.tasks.map((task) => {
                  const statusCol = task.column_values.find(
                    (c) => c.type === "status" || c.type === "color"
                  );
                  const statusColor = statusCol?.value?.label_style?.color || "#C4C4C4";
                  const isOverdue = section.key === "overdue";
                  const todayBadge = task._date && isToday(task._date);
                  const tomorrowBadge = task._date && isTomorrow(task._date);

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-md border-l-[3px] transition-colors ${
                        isOverdue ? "bg-red-50/50" : "hover:bg-muted/30"
                      }`}
                      style={{ borderLeftColor: statusColor }}
                    >
                      {/* Status dot */}
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusColor }}
                      />

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        {showBoardName && (
                          <p className="text-xs text-muted-foreground">{task.board_name}</p>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {todayBadge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-400 text-yellow-600">
                            TODAY
                          </Badge>
                        )}
                        {tomorrowBadge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600">
                            TOMORROW
                          </Badge>
                        )}
                        {statusCol?.text && (
                          <Badge
                            className="text-xs"
                            style={{
                              backgroundColor: statusColor,
                              color: "white",
                              border: "none",
                            }}
                          >
                            {statusCol.text}
                          </Badge>
                        )}
                        {task._date && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(task._date, "MMM dd")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
