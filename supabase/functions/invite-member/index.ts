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
      .maybeSingle();

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
