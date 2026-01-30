import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MondayBoard } from "@/types";

interface UseMondayBoardsReturn {
  boards: MondayBoard[];
  isLoading: boolean;
  error: string | null;
  fetchBoards: () => Promise<void>;
}

export function useMondayBoards(): UseMondayBoardsReturn {
  const [boards, setBoards] = useState<MondayBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-monday-boards",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch boards");
      }

      const data = await response.json();
      setBoards(data.boards || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch boards";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { boards, isLoading, error, fetchBoards };
}
