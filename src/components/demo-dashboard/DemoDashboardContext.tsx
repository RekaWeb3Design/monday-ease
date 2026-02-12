import { createContext, useContext, useState, type ReactNode } from "react";
import type { DemoTask } from "@/data/demoData";

interface DemoDashboardContextType {
  selectedTask: DemoTask | null;
  isDetailOpen: boolean;
  openTaskDetail: (task: DemoTask) => void;
  closeTaskDetail: () => void;
}

const DemoDashboardContext = createContext<DemoDashboardContextType | null>(null);

export function DemoDashboardProvider({ children }: { children: ReactNode }) {
  const [selectedTask, setSelectedTask] = useState<DemoTask | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const openTaskDetail = (task: DemoTask) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const closeTaskDetail = () => {
    setIsDetailOpen(false);
    setSelectedTask(null);
  };

  return (
    <DemoDashboardContext.Provider value={{ selectedTask, isDetailOpen, openTaskDetail, closeTaskDetail }}>
      {children}
    </DemoDashboardContext.Provider>
  );
}

export function useDemoDashboard() {
  const ctx = useContext(DemoDashboardContext);
  if (!ctx) throw new Error("useDemoDashboard must be used within DemoDashboardProvider");
  return ctx;
}
