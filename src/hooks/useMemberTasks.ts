import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MondayTask } from "@/types";

interface UseMemberTasksReturn {
  tasks: MondayTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EDGE_FUNCTION_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-member-tasks";

export function useMemberTasks(): UseMemberTasksReturn {
  const [tasks, setTasks] = useState<MondayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the current session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call the edge function
      const response = await fetch(EDGE_FUNCTION_URL, {
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
      
      // Show message if no tasks but not an error
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

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
  };
}
