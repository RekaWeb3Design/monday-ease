import { useState, useCallback } from "react";
import { callEdgeFunction } from "@/lib/edge-function";
import { useToast } from "@/hooks/use-toast";
import type { MondayBoard } from "@/types";

interface UseMondayBoardsReturn {
  boards: MondayBoard[];
  isLoading: boolean;
  error: string | null;
  fetchBoards: (mondayAccountId?: string) => Promise<void>;
}

export function useMondayBoards(): UseMondayBoardsReturn {
  const [boards, setBoards] = useState<MondayBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBoards = useCallback(async (mondayAccountId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = mondayAccountId ? { monday_account_id: mondayAccountId } : undefined;
      const data = await callEdgeFunction<{ boards: MondayBoard[] }>("get-monday-boards", params);
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
