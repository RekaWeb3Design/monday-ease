import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TASK_GROUPS, STATUS_OPTIONS, getAllTasks, getStatusColor } from "@/data/demoData";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { AvatarStack } from "./AvatarStack";
import { ProgressBar } from "./ProgressBar";
import { useDemoDashboard } from "./DemoDashboardContext";
import { List, Columns3 } from "lucide-react";

export function TasksTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const { openTaskDetail } = useDemoDashboard();

  const allTasks = getAllTasks();
  const today = new Date();

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, allTasks]);

  const filteredGroups = useMemo(() => {
    return TASK_GROUPS.map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    })).filter((group) => group.tasks.length > 0);
  }, [search, statusFilter]);

  // Group tasks by status for kanban
  const kanbanColumns = useMemo(() => {
    const statusOrder = STATUS_OPTIONS.map((s) => s.label);
    const grouped: Record<string, typeof filteredTasks> = {};
    for (const task of filteredTasks) {
      if (!grouped[task.status]) grouped[task.status] = [];
      grouped[task.status].push(task);
    }
    return statusOrder
      .filter((s) => grouped[s]?.length)
      .map((s) => ({ status: s, color: getStatusColor(s), tasks: grouped[s] }));
  }, [filteredTasks]);

  return (
    <div className="space-y-4">
      {/* Filters + View toggle */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Keresés..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Státusz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.label} value={s.label}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex rounded-lg overflow-hidden border">
          <button
            className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            onClick={() => setViewMode("table")}
            title="Táblázat nézet"
          >
            <List size={16} />
          </button>
          <button
            className={`p-2 transition-colors ${viewMode === "kanban" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            onClick={() => setViewMode("kanban")}
            title="Kanban nézet"
          >
            <Columns3 size={16} />
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <>
          {filteredGroups.map((group) => (
            <Card key={group.name} className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
              <CardHeader className="pb-0 pt-4 px-4" style={{ borderLeft: `4px solid ${group.color}` }}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{group.name}</span>
                  <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                    {group.tasks.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="uppercase text-xs text-muted-foreground">Feladat</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Státusz</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Prioritás</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Felelős</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Határidő</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Haladás</TableHead>
                      <TableHead className="uppercase text-xs text-muted-foreground">Alfeladatok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.tasks.map((task, i) => {
                      const isOverdue = new Date(task.due) < today && task.status !== "Kész";
                      return (
                        <TableRow
                          key={task.name}
                          className={`${i % 2 === 1 ? "bg-gray-50/30" : ""} hover:bg-blue-50/30 cursor-pointer`}
                          onClick={() => openTaskDetail(task)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{task.name}</span>
                              <span className="text-[10px] bg-gray-100 text-muted-foreground rounded px-1.5 py-0.5 whitespace-nowrap">
                                {task.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell><StatusBadge status={task.status} /></TableCell>
                          <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                          <TableCell><AvatarStack assignees={task.assignees} /></TableCell>
                          <TableCell>
                            <span className={`text-sm whitespace-nowrap ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                              {isOverdue && "⚠️ "}
                              {new Date(task.due).toLocaleDateString("hu-HU")}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[120px]"><ProgressBar value={task.progress} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{task.subtasksDone}/{task.subtasksTotal}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {filteredGroups.length === 0 && (
            <Card className="rounded-xl shadow-sm border-gray-100">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nincs találat a szűrési feltételeknek megfelelően.
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="flex flex-row gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="min-w-[280px] w-[280px] shrink-0">
              {/* Column header */}
              <div
                className="rounded-t-lg px-4 py-2 flex items-center justify-between"
                style={{ backgroundColor: `${col.color}26` }}
              >
                <span className="font-bold text-sm" style={{ color: col.color }}>{col.status}</span>
                <span
                  className="text-xs font-medium rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: col.color }}
                >
                  {col.tasks.length}
                </span>
              </div>

              {/* Column body */}
              <div className="bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[200px]">
                {col.tasks.map((task) => {
                  const isOverdue = new Date(task.due) < today && task.status !== "Kész";
                  return (
                    <div
                      key={task.name}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openTaskDetail(task)}
                    >
                      <p className="text-sm font-medium line-clamp-2 mb-1.5">{task.name}</p>
                      <span className="text-[10px] bg-gray-100 text-muted-foreground rounded px-1.5 py-0.5">
                        {task.category}
                      </span>
                      <div className="flex items-center justify-between mt-2.5">
                        <AvatarStack assignees={task.assignees} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className={`text-xs whitespace-nowrap ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {isOverdue && "⚠️ "}
                          {new Date(task.due).toLocaleDateString("hu-HU")}
                        </span>
                        <div className="w-20">
                          <ProgressBar value={task.progress} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {kanbanColumns.length === 0 && (
            <div className="w-full text-center text-muted-foreground py-8">
              Nincs találat a szűrési feltételeknek megfelelően.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
