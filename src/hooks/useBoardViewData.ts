import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ViewDataResponse, ViewDataItem, ViewSettings, ViewColumn } from "@/types";

interface UseBoardViewDataParams {
  viewId: string | null;
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string | null;
  sortOrder?: 'asc' | 'desc';
}

interface UseBoardViewDataReturn {
  view: {
    name: string;
    icon: string;
    settings: ViewSettings;
    columns: ViewColumn[];
  } | null;
  items: ViewDataItem[];
  totalCount: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBoardViewData({
  viewId,
  page = 1,
  limit = 50,
  search = "",
  sortColumn = null,
  sortOrder = 'asc',
}: UseBoardViewDataParams): UseBoardViewDataReturn {
  const [view, setView] = useState<UseBoardViewDataReturn['view']>(null);
  const [items, setItems] = useState<ViewDataItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!viewId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const params = new URLSearchParams({
        view_id: viewId,
        page: String(page),
        limit: String(limit),
      });

      if (search) params.set("search", search);
      if (sortColumn) params.set("sort", sortColumn);
      if (sortOrder) params.set("order", sortOrder);

      const response = await fetch(
        `https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-board-view-data?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ViewDataResponse = await response.json();

      setView(data.view);
      setItems(data.items);
      setTotalCount(data.total_count);
      setCurrentPage(data.page);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch view data";
      setError(message);
      console.error("[useBoardViewData] Error:", err);
      toast({
        title: "Error loading view",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [viewId, page, limit, search, sortColumn, sortOrder, toast]);

  // Refetch when params change
  useEffect(() => {
    if (viewId) {
      fetchData();
    }
  }, [viewId, page, limit, search, sortColumn, sortOrder, fetchData]);

  return {
    view,
    items,
    totalCount,
    currentPage,
    isLoading,
    error,
    refetch: fetchData,
  };
}
