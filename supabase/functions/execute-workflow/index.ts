import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";
import { getDecryptedMondayToken, MondayIntegrationError } from "../_shared/monday.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);
    const callerId = user.id;

    const { templateId, inputParams } = await req.json();

    if (!templateId) {
      return jsonResponse({ error: "Template ID required" }, 400);
    }

    // Get caller's membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", callerId)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return jsonResponse({ error: "No active membership" }, 403);
    }

    // Get template
    const { data: template } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .maybeSingle();

    if (!template) {
      return jsonResponse({ error: "Template not found" }, 404);
    }

    // Get organization owner
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (!org) {
      return jsonResponse({ error: "Organization not found" }, 404);
    }

    // Get Monday token (optional - some workflows may not need it)
    // Use monday_account_id from inputParams if provided
    const mondayAccountId = inputParams?.monday_account_id || undefined;
    let mondayToken: string | null = null;
    try {
      mondayToken = await getDecryptedMondayToken(org.owner_id, adminClient, mondayAccountId);
    } catch (e) {
      if (e instanceof MondayIntegrationError) {
        console.log("Monday.com not configured, proceeding without token");
      } else {
        throw e;
      }
    }

    // Create execution record
    const startedAt = new Date();
    const { data: execution, error: execError } = await adminClient
      .from("workflow_executions")
      .insert({
        template_id: templateId,
        organization_id: membership.organization_id,
        user_id: callerId,
        status: "running",
        input_params: inputParams || {},
        started_at: startedAt.toISOString(),
      })
      .select("id")
      .single();

    if (execError || !execution) {
      console.error("Execution record error:", execError);
      return jsonResponse({ error: "Failed to create execution record" }, 500);
    }

    // Call n8n webhook
    try {
      const response = await fetch(template.n8n_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inputParams,
          execution_id: execution.id,
          organization_id: membership.organization_id,
          user_id: callerId,
          monday_token: mondayToken,
        }),
      });

      const completedAt = new Date();
      const executionTimeMs = completedAt.getTime() - startedAt.getTime();

      if (!response.ok) {
        const errorText = await response.text();
        await adminClient
          .from("workflow_executions")
          .update({
            status: "failed",
            completed_at: completedAt.toISOString(),
            execution_time_ms: executionTimeMs,
            error_message: `Webhook failed: ${response.status}`,
          })
          .eq("id", execution.id);

        console.error(`Workflow failed: ${errorText}`);
        return jsonResponse({ error: "Workflow failed", executionId: execution.id }, 500);
      }

      const result = await response.json();

      await adminClient
        .from("workflow_executions")
        .update({
          status: "success",
          completed_at: completedAt.toISOString(),
          execution_time_ms: executionTimeMs,
          output_result: result,
        })
        .eq("id", execution.id);

      // Update template execution count
      await adminClient
        .from("workflow_templates")
        .update({ execution_count: (template.execution_count || 0) + 1 })
        .eq("id", templateId);

      console.log(`Workflow executed: ${execution.id} in ${executionTimeMs}ms`);
      return jsonResponse({ success: true, executionId: execution.id, result });

    } catch (webhookError) {
      const completedAt = new Date();
      await adminClient
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: completedAt.toISOString(),
          execution_time_ms: completedAt.getTime() - startedAt.getTime(),
          error_message: webhookError instanceof Error ? webhookError.message : "Unknown error",
        })
        .eq("id", execution.id);

      console.error("Webhook error:", webhookError);
      return jsonResponse({ error: "Workflow failed", executionId: execution.id }, 500);
    }

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
