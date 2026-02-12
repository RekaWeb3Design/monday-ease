import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { getAllTasks, TASK_GROUPS, TEAM_MEMBERS, type DemoTask, type TaskGroup } from "@/data/demoData";
import { startOfWeek, endOfWeek, format } from "date-fns";

type DateRange = "today" | "week" | "month" | "all";

interface DemoDashboardContextType {
  selectedTask: DemoTask | null;
  isDetailOpen: boolean;
  openTaskDetail: (task: DemoTask) => void;
  closeTaskDetail: () => void;
  // Global filters
  selectedMembers: string[];
  selectedPriorities: string[];
  dateRange: DateRange;
  toggleMember: (name: string) => void;
  togglePriority: (priority: string) => void;
  setDateRange: (range: DateRange) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  filteredTasks: DemoTask[];
  filteredGroups: TaskGroup[];
  allTasks: DemoTask[];
}

const DemoDashboardContext = createContext<DemoDashboardContextType | null>(null);

export function DemoDashboardProvider({ children }: { children: ReactNode }) {
  const [selectedTask, setSelectedTask] = useState<DemoTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const openTaskDetail = (task: DemoTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const closeTaskDetail = () => {
    setIsDetailOpen(false);
    setSelectedTask(null);
  };

  const toggleMember = (name: string) => {
    setSelectedMembers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
  };

  const clearFilters = () => {
    setSelectedMembers([]);
    setSelectedPriorities([]);
    setDateRange("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedMembers.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (dateRange !== "all") count++;
    return count;
  }, [selectedMembers, selectedPriorities, dateRange]);

  const allTasks = useMemo(() => getAllTasks(), []);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthPrefix = format(today, "yyyy-MM");

    return allTasks.filter((task) => {
      // Member filter
      if (selectedMembers.length > 0 && !task.assignees.some((a) => selectedMembers.includes(a))) {
        return false;
      }
      // Priority filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
        return false;
      }
      // Date range filter
      if (dateRange !== "all") {
        const taskDate = new Date(task.due);
        taskDate.setHours(0, 0, 0, 0);
        if (dateRange === "today" && task.due !== todayStr) return false;
        if (dateRange === "week" && (taskDate < weekStart || taskDate > weekEnd)) return false;
        if (dateRange === "month" && !task.due.startsWith(monthPrefix)) return false;
      }
      return true;
    });
  }, [allTasks, selectedMembers, selectedPriorities, dateRange]);

  const filteredGroups = useMemo(() => {
    const filteredSet = new Set(filteredTasks);
    return TASK_GROUPS.map((group) => ({
      ...group,
      tasks: group.tasks.filter((t) => filteredSet.has(t)),
    })).filter((g) => g.tasks.length > 0);
  }, [filteredTasks]);

  return (
    <DemoDashboardContext.Provider
      value={{
        selectedTask, isDetailOpen, openTaskDetail, closeTaskDetail,
        selectedMembers, selectedPriorities, dateRange,
        toggleMember, togglePriority, setDateRange, clearFilters,
        activeFilterCount, filteredTasks, filteredGroups, allTasks,
      }}
    >
      {children}
    </DemoDashboardContext.Provider>
  );
}

export function useDemoDashboard() {
  const ctx = useContext(DemoDashboardContext);
  if (!ctx) throw new Error("useDemoDashboard must be used within DemoDashboardProvider");
  return ctx;
}
