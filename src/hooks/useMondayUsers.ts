import { useState, useCallback } from "react";
import { callEdgeFunction } from "@/lib/edge-function";
import type { MondayUser } from "@/types";

interface UseMondayUsersReturn {
  users: MondayUser[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

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
      const data = await callEdgeFunction<{ users: MondayUser[] }>("get-monday-users");
      setUsers(data.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch Monday users";
      console.error("Error fetching Monday users:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { users, isLoading, error, fetchUsers };
}
