import { useState, useCallback, useEffect } from "react";
import { callEdgeFunction } from "@/lib/edge-function";
import type { MondayTask } from "@/types";

interface UseMemberTasksForMemberReturn {
  tasks: MondayTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for organization owners to fetch tasks for a specific member.
 */
export function useMemberTasksForMember(memberId: string | null): UseMemberTasksForMemberReturn {
  const [tasks, setTasks] = useState<MondayTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!memberId) {
      setTasks([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await callEdgeFunction<{ tasks: MondayTask[]; message?: string }>(
        "get-member-tasks",
        { member_id: memberId }
      );
      setTasks(data.tasks || []);

      if (data.message && data.tasks?.length === 0) {
        console.log("Member tasks message:", data.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch member tasks";
      console.error("Error fetching member tasks:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) {
      fetchTasks();
    } else {
      setTasks([]);
      setError(null);
      setIsLoading(false);
    }
  }, [memberId, fetchTasks]);

  return { tasks, isLoading, error, refetch: fetchTasks };
}
