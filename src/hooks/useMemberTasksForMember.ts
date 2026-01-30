import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MondayTask } from "@/types";

interface UseMemberTasksForMemberReturn {
  tasks: MondayTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EDGE_FUNCTION_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-member-tasks";

/**
 * Hook for organization owners to fetch tasks for a specific member.
 * Uses the member_id query parameter to enable owner impersonation.
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
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call the edge function with member_id parameter
      const response = await fetch(`${EDGE_FUNCTION_URL}?member_id=${encodeURIComponent(memberId)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setTasks(data.tasks || []);
      
      // Log message if no tasks
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

  // Fetch tasks when memberId changes
  useEffect(() => {
    if (memberId) {
      fetchTasks();
    } else {
      setTasks([]);
      setError(null);
      setIsLoading(false);
    }
  }, [memberId, fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}
