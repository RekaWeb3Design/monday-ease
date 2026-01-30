import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { MondayTask } from "@/types";

interface TaskStatsProps {
  tasks: MondayTask[];
}

// Helper to find status column value from task
function getStatusValue(task: MondayTask): string | null {
  // Look for status-type columns
  const statusCol = task.column_values.find(
    (cv) => cv.type === "status" || cv.type === "color"
  );
  return statusCol?.text?.toLowerCase() || null;
}

export function TaskStats({ tasks }: TaskStatsProps) {
  // Calculate stats
  const total = tasks.length;
  
  // Count tasks by status
  let inProgress = 0;
  let done = 0;
  let stuck = 0;

  for (const task of tasks) {
    const status = getStatusValue(task);
    if (!status) continue;
    
    if (status.includes("done") || status.includes("complete")) {
      done++;
    } else if (status.includes("stuck") || status.includes("block")) {
      stuck++;
    } else if (status.includes("progress") || status.includes("working")) {
      inProgress++;
    }
  }

  const stats = [
    {
      title: "Total Tasks",
      value: total,
      icon: ClipboardList,
      className: "text-primary",
    },
    {
      title: "In Progress",
      value: inProgress,
      icon: Clock,
      className: "text-[#ffcd03]",
    },
    {
      title: "Done",
      value: done,
      icon: CheckCircle2,
      className: "text-[#01cb72]",
    },
    {
      title: "Stuck",
      value: stuck,
      icon: AlertCircle,
      className: "text-[#fb275d]",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.className}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
