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
      .maybeSingle();

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
