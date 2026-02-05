
# Edge Function Consolidation Implementation

## Overview

Create three edge functions (`invite-member`, `activate-invited-member`, `execute-workflow`) using the shared modules for consistent authentication, CORS handling, and Monday.com API access.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/invite-member/index.ts` | CREATE | Invite members via Supabase Auth magic link |
| `supabase/functions/activate-invited-member/index.ts` | CREATE | Activate pending memberships on login |
| `supabase/functions/execute-workflow/index.ts` | CREATE | Execute n8n workflows with owner's Monday token |
| `supabase/config.toml` | UPDATE | Add function configs with `verify_jwt = false` |
| `src/hooks/useOrganizationMembers.ts` | UPDATE | Call edge function instead of direct insert |

---

## 1. invite-member/index.ts (NEW)

Creates pending membership and sends invite email via Supabase Auth.

```typescript
import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);
    const callerId = user.id;

    const { email, displayName, organizationId } = await req.json();

    if (!email || !displayName || !organizationId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    // Verify caller is org owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!membership || membership.role !== "owner") {
      return jsonResponse({ error: "Only owners can invite members" }, 403);
    }

    // Check for duplicate
    const { data: existing } = await adminClient
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return jsonResponse({ 
        error: existing.status === "pending" 
          ? "This email has already been invited" 
          : "This email is already a member"
      }, 400);
    }

    // Create pending membership
    const { data: newMember, error: insertError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: null,
        email: email.toLowerCase().trim(),
        display_name: displayName.trim(),
        role: "member",
        status: "pending",
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonResponse({ error: "Failed to create invitation" }, 500);
    }

    // Send invite via Supabase Auth
    const siteUrl = Deno.env.get("SITE_URL") || "https://ease-hub-dash.lovable.app";
    
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${siteUrl}/auth`,
        data: {
          invited_to_organization: organizationId,
          display_name: displayName.trim(),
        },
      }
    );

    if (inviteError) {
      // Rollback
      await adminClient.from("organization_members").delete().eq("id", newMember.id);
      console.error("Invite email error:", inviteError);
      return jsonResponse({ error: "Failed to send invitation email" }, 500);
    }

    console.log(`Invitation sent to ${email} for org ${organizationId}`);
    return jsonResponse({ success: true, memberId: newMember.id });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
```

---

## 2. activate-invited-member/index.ts (NEW)

Activates pending membership when invited user signs in.

```typescript
import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, adminClient } = await getAuthenticatedContext(req);
    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return jsonResponse({ error: "User email not found" }, 400);
    }

    // Check metadata for invitation
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    const invitedOrgId = authUser?.user?.user_metadata?.invited_to_organization;
    const displayName = authUser?.user?.user_metadata?.display_name;

    if (!invitedOrgId) {
      return jsonResponse({ success: false, message: "No pending invitation" });
    }

    // Find pending membership
    const { data: pendingMember } = await adminClient
      .from("organization_members")
      .select("id, display_name")
      .eq("organization_id", invitedOrgId)
      .eq("email", userEmail.toLowerCase())
      .eq("status", "pending")
      .is("user_id", null)
      .single();

    if (!pendingMember) {
      return jsonResponse({ success: false, message: "No pending membership found" });
    }

    // Activate membership
    const { error: updateError } = await adminClient
      .from("organization_members")
      .update({
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
        display_name: displayName || pendingMember.display_name,
      })
      .eq("id", pendingMember.id);

    if (updateError) {
      console.error("Activation error:", updateError);
      return jsonResponse({ error: "Failed to activate membership" }, 500);
    }

    // Update user profile
    await adminClient
      .from("user_profiles")
      .update({
        user_type: "member",
        primary_organization_id: invitedOrgId,
        full_name: displayName || pendingMember.display_name,
      })
      .eq("id", userId);

    // Clear invitation metadata
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { invited_to_organization: null, display_name: null },
    });

    console.log(`Membership activated: user ${userId} joined org ${invitedOrgId}`);
    return jsonResponse({ success: true, organizationId: invitedOrgId });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
```

---

## 3. execute-workflow/index.ts (NEW)

Executes n8n workflows with owner's Monday.com token.

**Note:** Uses corrected column names: `output_result` and `execution_time_ms`

```typescript
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
      .single();

    if (!membership) {
      return jsonResponse({ error: "No active membership" }, 403);
    }

    // Get template
    const { data: template } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (!template) {
      return jsonResponse({ error: "Template not found" }, 404);
    }

    // Get organization owner
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", membership.organization_id)
      .single();

    if (!org) {
      return jsonResponse({ error: "Organization not found" }, 404);
    }

    // Get Monday token (optional - some workflows may not need it)
    let mondayToken: string | null = null;
    try {
      mondayToken = await getDecryptedMondayToken(org.owner_id, adminClient);
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
        .update({ execution_count: template.execution_count + 1 })
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
```

---

## 4. supabase/config.toml (UPDATE)

```toml
project_id = "yqjugovqhvxoxvrceqqp"

[functions.get-member-tasks]
verify_jwt = false

[functions.get-monday-users]
verify_jwt = false

[functions.get-board-view-data]
verify_jwt = false

[functions.invite-member]
verify_jwt = false

[functions.activate-invited-member]
verify_jwt = false

[functions.execute-workflow]
verify_jwt = false
```

---

## 5. useOrganizationMembers.ts (UPDATE)

Update `inviteMember` to call the edge function:

```typescript
const inviteMember = useCallback(
  async (email: string, displayName: string) => {
    if (!organization || !user) {
      throw new Error("Organization or user not available");
    }

    const { data, error } = await supabase.functions.invoke("invite-member", {
      body: {
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        organizationId: organization.id,
      },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to invite member.",
        variant: "destructive",
      });
      throw error;
    }

    if (!data?.success) {
      const errorMessage = data?.error || "Failed to invite member.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    }

    toast({
      title: "Invitation Sent",
      description: `${displayName} has been invited to join your organization.`,
    });

    await fetchMembers();
  },
  [organization, user, toast, fetchMembers]
);
```

---

## Testing After Deployment

1. **invite-member**: Organization page → Invite member → Check logs
2. **activate-invited-member**: Click invite email → Sign up → Verify activation
3. **execute-workflow**: Templates page → Run workflow → Check logs
