import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { WorkflowExecution } from "@/types";

interface UseWorkflowExecutionsReturn {
  executions: WorkflowExecution[];
  isLoading: boolean;
  error: string | null;
  createExecution: (templateId: string, inputParams: Record<string, any>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useWorkflowExecutions(): UseWorkflowExecutionsReturn {
  const { organization, user } = useAuth();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchExecutions = useCallback(async () => {
    if (!organization?.id) {
      setExecutions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow_templates (
            id,
            name,
            description,
            category,
            icon
          )
        `)
        .eq("organization_id", organization.id)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (queryError) {
        throw queryError;
      }

      // Cast to WorkflowExecution[] - status string is narrower in our type
      setExecutions((data || []) as unknown as WorkflowExecution[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch executions";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, toast]);

  const createExecution = useCallback(async (
    templateId: string,
    inputParams: Record<string, any>
  ): Promise<boolean> => {
    if (!organization?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from("workflow_executions")
        .insert({
          template_id: templateId,
          organization_id: organization.id,
          user_id: user.id,
          status: "pending",
          input_params: inputParams,
          started_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Workflow queued",
        description: "Your workflow has been queued for execution.",
      });

      // Refetch to update the list
      await fetchExecutions();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create execution";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [organization?.id, user?.id, toast, fetchExecutions]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return { executions, isLoading, error, createExecution, refetch: fetchExecutions };
}
