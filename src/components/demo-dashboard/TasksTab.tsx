import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TASK_GROUPS, STATUS_OPTIONS } from "@/data/demoData";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { AvatarStack } from "./AvatarStack";
import { ProgressBar } from "./ProgressBar";

export function TasksTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Filters */}
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
      </div>

      {/* Grouped tables */}
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
                    <TableRow key={task.name} className={`${i % 2 === 1 ? "bg-gray-50/30" : ""} hover:bg-blue-50/30`}>
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
    </div>
  );
}
