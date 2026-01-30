import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MondayUser } from "@/types";

interface UseMondayUsersReturn {
  users: MondayUser[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

const EDGE_FUNCTION_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-monday-users";

/**
 * Hook to fetch Monday.com workspace users.
 * Only accessible by organization owners.
 */
export function useMondayUsers(): UseMondayUsersReturn {
  const [users, setUsers] = useState<MondayUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
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

      setUsers(data.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch Monday users";
      console.error("Error fetching Monday users:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
  };
}
