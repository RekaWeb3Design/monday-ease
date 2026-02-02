import { useState, useCallback, useEffect } from "react";
import { callEdgeFunction } from "@/lib/edge-function";
import { useToast } from "@/hooks/use-toast";
import type { MondayTask } from "@/types";

interface UseMemberTasksReturn {
  tasks: MondayTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMemberTasks(): UseMemberTasksReturn {
  const [tasks, setTasks] = useState<MondayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await callEdgeFunction<{ tasks: MondayTask[]; message?: string }>("get-member-tasks");
      setTasks(data.tasks || []);

      if (data.message && data.tasks?.length === 0) {
        console.log("Member tasks message:", data.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch tasks";
      console.error("Error fetching member tasks:", err);
      setError(message);
      toast({
        title: "Error loading tasks",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, error, refetch: fetchTasks };
}
