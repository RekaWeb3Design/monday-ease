import { useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MondayTask } from "@/types";
import { isPast, isThisWeek, startOfWeek, addWeeks, isBefore } from "date-fns";

const TYPE_COLORS = ["#00CA72", "#FDAB3D", "#E2445C", "#0086C0", "#A25DDC", "#037F4C", "#66CCFF", "#FF642E"];

interface Props {
  tasks: MondayTask[];
}

function NoData() {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
      No data available
    </div>
  );
}

export function TaskChartsView({ tasks }: Props) {
  // --- Status donut ---
  const statusData = useMemo(() => {
    const map = new Map<string, { count: number; color: string }>();
    tasks.forEach((t) => {
      const col = t.column_values.find((c) => c.type === "status" || c.type === "color");
      if (!col) return;
      const label = col.text || "No Status";
      const color = col.value?.label_style?.color || "#C4C4C4";
      const entry = map.get(label);
      if (entry) entry.count++;
      else map.set(label, { count: 1, color });
    });
    return Array.from(map.entries()).map(([name, d]) => ({ name, value: d.count, color: d.color }));
  }, [tasks]);

  // --- Board bar ---
  const boardData = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      map.set(t.board_name, (map.get(t.board_name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [tasks]);

  // --- Type bar ---
  const typeData = useMemo(() => {
    // Find a "type"-ish column
    const sample = tasks[0]?.column_values;
    if (!sample) return null;
    const typeCol =
      sample.find((c) => c.title.toLowerCase().includes("type")) ||
      sample.find((c) => c.type !== "status" && c.type !== "color" && c.type !== "date" && c.type !== "numbers" && c.text);
    if (!typeCol) return null;

    const map = new Map<string, number>();
    tasks.forEach((t) => {
      const cv = t.column_values.find((c) => c.id === typeCol.id);
      const label = cv?.text || "Unset";
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count], i) => ({
      name,
      count,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    }));
  }, [tasks]);

  // --- Deadline bar ---
  const deadlineData = useMemo(() => {
    const sample = tasks[0]?.column_values;
    if (!sample) return null;
    const dateCol = sample.find((c) => c.type === "date");
    if (!dateCol) return null;

    const now = new Date();
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
    const weekAfterNext = startOfWeek(addWeeks(now, 2), { weekStartsOn: 1 });

    const buckets = { Overdue: 0, "This Week": 0, "Next Week": 0, Later: 0 };

    tasks.forEach((t) => {
      const cv = t.column_values.find((c) => c.id === dateCol.id);
      if (!cv?.text) return;
      try {
        const d = new Date(cv.text);
        if (isPast(d) && !isThisWeek(d, { weekStartsOn: 1 })) buckets.Overdue++;
        else if (isThisWeek(d, { weekStartsOn: 1 })) buckets["This Week"]++;
        else if (isBefore(d, weekAfterNext)) buckets["Next Week"]++;
        else buckets.Later++;
      } catch {
        /* skip */
      }
    });

    const colors: Record<string, string> = {
      Overdue: "#E2445C",
      "This Week": "#FDAB3D",
      "Next Week": "#00CA72",
      Later: "#C4C4C4",
    };

    return Object.entries(buckets).map(([name, count]) => ({ name, count, color: colors[name] }));
  }, [tasks]);

  const renderCustomLabel = ({
    cx,
    cy,
  }: {
    cx: number;
    cy: number;
  }) => (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-xl font-bold">
      {tasks.length}
    </text>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
      {/* Donut — Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} (${((value / tasks.length) * 100).toFixed(0)}%)`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Horizontal bar — Boards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tasks by Board</CardTitle>
        </CardHeader>
        <CardContent>
          {boardData.length === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={boardData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#00CA72" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Vertical bar — Type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tasks by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {!typeData ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {typeData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Deadline bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {!deadlineData ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No date column available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deadlineData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {deadlineData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
