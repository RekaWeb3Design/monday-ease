import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { CustomBoardView, ViewColumn, ViewSettings } from "@/types";
import type { Json } from "@/integrations/supabase/types";

interface CreateViewData {
  name: string;
  description?: string;
  icon: string;
  monday_board_id: string;
  monday_board_name: string;
  selected_columns: ViewColumn[];
  settings: ViewSettings;
}

interface UpdateViewData extends Partial<CreateViewData> {
  is_active?: boolean;
  display_order?: number;
}

interface UseCustomBoardViewsReturn {
  views: CustomBoardView[];
  isLoading: boolean;
  error: string | null;
  fetchViews: () => Promise<void>;
  createView: (data: CreateViewData) => Promise<CustomBoardView | null>;
  updateView: (id: string, data: UpdateViewData) => Promise<boolean>;
  deleteView: (id: string) => Promise<boolean>;
  getViewBySlug: (slug: string) => CustomBoardView | undefined;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Collapse multiple hyphens
    .substring(0, 50);        // Limit length
}

// Query key factory for consistency
const viewsQueryKey = (orgId: string | undefined) => ['custom-board-views', orgId];

export function useCustomBoardViews(): UseCustomBoardViewsReturn {
  const { toast } = useToast();
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch views using React Query
  const { data: views = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: viewsQueryKey(organization?.id),
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error: fetchError } = await supabase
        .from("custom_board_views")
        .select("*")
        .eq("organization_id", organization.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Parse JSONB fields
      const parsedViews: CustomBoardView[] = (data || []).map(row => ({
        ...row,
        selected_columns: typeof row.selected_columns === 'string' 
          ? JSON.parse(row.selected_columns) 
          : row.selected_columns || [],
        settings: typeof row.settings === 'string'
          ? JSON.parse(row.settings)
          : row.settings || {
              show_item_name: true,
              row_height: 'default',
              enable_search: true,
              enable_filters: true,
              default_sort_column: null,
              default_sort_order: 'asc',
              view_mode: 'table',
            },
      }));

      return parsedViews;
    },
    enabled: !!organization?.id,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateViewData) => {
      if (!organization?.id) throw new Error("No organization found");

      let slug = generateSlug(data.name);
      
      // Ensure unique slug
      const existingSlugs = views.map(v => v.slug);
      let counter = 1;
      let uniqueSlug = slug;
      while (existingSlugs.includes(uniqueSlug)) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      const { data: newView, error: createError } = await supabase
        .from("custom_board_views")
        .insert([{
          organization_id: organization.id,
          name: data.name,
          slug: uniqueSlug,
          description: data.description || null,
          icon: data.icon,
          monday_board_id: data.monday_board_id,
          monday_board_name: data.monday_board_name,
          selected_columns: data.selected_columns as unknown as Json,
          settings: data.settings as unknown as Json,
          display_order: views.length,
        }])
        .select()
        .single();

      if (createError) throw createError;

      return {
        ...newView,
        selected_columns: newView.selected_columns as unknown as ViewColumn[],
        settings: newView.settings as unknown as ViewSettings,
      } as CustomBoardView;
    },
    onSuccess: (newView) => {
      // Invalidate and refetch to update all components using this data
      queryClient.invalidateQueries({ queryKey: viewsQueryKey(organization?.id) });
      toast({
        title: "View Created",
        description: `"${newView.name}" has been created successfully.`,
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateViewData }) => {
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) {
        updateData.name = data.name;
        const newSlug = generateSlug(data.name);
        const existingSlugs = views.filter(v => v.id !== id).map(v => v.slug);
        if (!existingSlugs.includes(newSlug)) {
          updateData.slug = newSlug;
        }
      }
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.monday_board_id !== undefined) updateData.monday_board_id = data.monday_board_id;
      if (data.monday_board_name !== undefined) updateData.monday_board_name = data.monday_board_name;
      if (data.selected_columns !== undefined) updateData.selected_columns = data.selected_columns;
      if (data.settings !== undefined) updateData.settings = data.settings;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.display_order !== undefined) updateData.display_order = data.display_order;

      const { error: updateError } = await supabase
        .from("custom_board_views")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      return { id, data: updateData };
    },
    onSuccess: () => {
      // Invalidate and refetch to update all components (including sidebar)
      queryClient.invalidateQueries({ queryKey: viewsQueryKey(organization?.id) });
      toast({
        title: "View Updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const viewToDelete = views.find(v => v.id === id);
      
      const { error: deleteError } = await supabase
        .from("custom_board_views")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return viewToDelete;
    },
    onSuccess: (deletedView) => {
      // Invalidate and refetch to update all components (including sidebar)
      queryClient.invalidateQueries({ queryKey: viewsQueryKey(organization?.id) });
      toast({
        title: "View Deleted",
        description: `"${deletedView?.name}" has been deleted.`,
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Wrapper functions to maintain API compatibility
  const fetchViews = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createView = useCallback(async (data: CreateViewData): Promise<CustomBoardView | null> => {
    try {
      return await createMutation.mutateAsync(data);
    } catch {
      return null;
    }
  }, [createMutation]);

  const updateView = useCallback(async (id: string, data: UpdateViewData): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateMutation]);

  const deleteView = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  const getViewBySlug = useCallback((slug: string): CustomBoardView | undefined => {
    return views.find(view => view.slug === slug);
  }, [views]);

  return {
    views,
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    fetchViews,
    createView,
    updateView,
    deleteView,
    getViewBySlug,
  };
}
