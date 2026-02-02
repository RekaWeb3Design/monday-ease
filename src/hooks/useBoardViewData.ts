import { useState, useCallback, useEffect } from "react";
import { callEdgeFunction } from "@/lib/edge-function";
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
      const params: Record<string, string> = {
        view_id: viewId,
        page: String(page),
        limit: String(limit),
      };
      if (search) params.search = search;
      if (sortColumn) params.sort = sortColumn;
      if (sortOrder) params.order = sortOrder;

      const data = await callEdgeFunction<ViewDataResponse>(
        "get-board-view-data",
        params
      );

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
