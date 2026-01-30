import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { CustomBoardView, ViewColumn, ViewSettings } from "@/types";

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

export function useCustomBoardViews(): UseCustomBoardViewsReturn {
  const [views, setViews] = useState<CustomBoardView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { organization } = useAuth();

  const fetchViews = useCallback(async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
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
            },
      }));

      setViews(parsedViews);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch views";
      setError(message);
      console.error("[useCustomBoardViews] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  const createView = useCallback(async (data: CreateViewData): Promise<CustomBoardView | null> => {
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization found",
        variant: "destructive",
      });
      return null;
    }

    try {
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
          selected_columns: JSON.stringify(data.selected_columns),
          settings: JSON.stringify(data.settings),
          display_order: views.length,
        }])
        .select()
        .single();

      if (createError) throw createError;

      const parsedView: CustomBoardView = {
        ...newView,
        selected_columns: newView.selected_columns as unknown as ViewColumn[],
        settings: newView.settings as unknown as ViewSettings,
      };

      setViews(prev => [...prev, parsedView]);
      
      toast({
        title: "View Created",
        description: `"${data.name}" has been created successfully.`,
      });

      return parsedView;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return null;
    }
  }, [organization?.id, views, toast]);

  const updateView = useCallback(async (id: string, data: UpdateViewData): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) {
        updateData.name = data.name;
        // Optionally update slug if name changed
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

      setViews(prev => prev.map(view => 
        view.id === id 
          ? { ...view, ...updateData, updated_at: new Date().toISOString() }
          : view
      ));

      toast({
        title: "View Updated",
        description: "Changes saved successfully.",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [views, toast]);

  const deleteView = useCallback(async (id: string): Promise<boolean> => {
    try {
      const viewToDelete = views.find(v => v.id === id);
      
      const { error: deleteError } = await supabase
        .from("custom_board_views")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setViews(prev => prev.filter(view => view.id !== id));

      toast({
        title: "View Deleted",
        description: `"${viewToDelete?.name}" has been deleted.`,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete view";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [views, toast]);

  const getViewBySlug = useCallback((slug: string): CustomBoardView | undefined => {
    return views.find(view => view.slug === slug);
  }, [views]);

  // Auto-fetch on mount and org change
  useEffect(() => {
    if (organization?.id) {
      fetchViews();
    }
  }, [organization?.id, fetchViews]);

  return {
    views,
    isLoading,
    error,
    fetchViews,
    createView,
    updateView,
    deleteView,
    getViewBySlug,
  };
}
