import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WorkflowTemplate } from "@/types";

interface UseWorkflowTemplatesReturn {
  templates: WorkflowTemplate[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkflowTemplates(): UseWorkflowTemplatesReturn {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("execution_count", { ascending: false, nullsFirst: false });

      if (queryError) {
        throw queryError;
      }

      // Cast to WorkflowTemplate[] - input_schema is Json from DB but we use Record<string, any>
      setTemplates((data || []) as unknown as WorkflowTemplate[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch templates";
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

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, error, refetch: fetchTemplates };
}
