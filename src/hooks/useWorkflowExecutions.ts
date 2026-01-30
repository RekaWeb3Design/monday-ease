import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { WorkflowExecution, ExecutionResult } from "@/types";

interface UseWorkflowExecutionsReturn {
  executions: WorkflowExecution[];
  isLoading: boolean;
  error: string | null;
  createExecution: (templateId: string, inputParams: Record<string, any>) => Promise<ExecutionResult | null>;
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
          ),
          user_profiles!workflow_executions_user_id_fkey (
            email
          )
        `)
        .eq("organization_id", organization.id)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (queryError) {
        throw queryError;
      }

      // Transform data to include user_email at top level
      const transformedData = (data || []).map((exec: any) => ({
        ...exec,
        user_email: exec.user_profiles?.email || null,
        user_profiles: undefined, // Remove nested object
      }));

      setExecutions(transformedData as WorkflowExecution[]);
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
  ): Promise<ExecutionResult | null> => {
    if (!organization?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('execute-workflow', {
        body: {
          template_id: templateId,
          input_params: inputParams,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!data.success) {
        throw new Error(data.error || "Workflow execution failed");
      }

      // Refetch to update the list
      await fetchExecutions();

      return data as ExecutionResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to execute workflow";
      toast({
        title: "Execution Failed",
        description: message,
        variant: "destructive",
      });
      return null;
    }
  }, [organization?.id, user?.id, toast, fetchExecutions]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return { executions, isLoading, error, createExecution, refetch: fetchExecutions };
}
