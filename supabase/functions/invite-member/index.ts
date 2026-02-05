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

    const normalizedEmail = email.toLowerCase().trim();

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

    // Check for duplicate membership
    const { data: existing } = await adminClient
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ 
        error: existing.status === "pending" 
          ? "This email has already been invited" 
          : "This email is already a member"
      }, 400);
    }

    // Check if user already exists in auth system
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return jsonResponse({ 
        error: "This email is already registered. Ask them to sign in and join your organization."
      }, 400);
    }

    // Create pending membership record first
    const { data: newMember, error: insertError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: null,
        email: normalizedEmail,
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

    // Step 1: Create user with temporary password (email auto-confirmed)
    const tempPassword = crypto.randomUUID();

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true, // Skip email confirmation - they're invited
      user_metadata: {
        invited_to_organization: organizationId,
        display_name: displayName.trim(),
      },
    });

    if (createError) {
      // Rollback member record
      await adminClient.from("organization_members").delete().eq("id", newMember.id);
      console.error("User creation error:", createError);
      return jsonResponse({ error: "Failed to create user account" }, 500);
    }

    // Step 2: Generate password recovery link (triggers auth-email-hook)
    const siteUrl = Deno.env.get("SITE_URL") || "https://ease-hub-dash.lovable.app";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/auth`,
      },
    });

    if (linkError) {
      // Full cleanup: delete user and member record
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from("organization_members").delete().eq("id", newMember.id);
      console.error("Link generation error:", linkError);
      return jsonResponse({ error: "Failed to generate invitation link" }, 500);
    }

    // The auth-email-hook will intercept and send the branded email
    // Since we're using 'recovery' type, it will use the password reset template
    console.log(`Invitation created for ${email}, recovery link generated for org ${organizationId}`);
    
    return jsonResponse({ success: true, memberId: newMember.id });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
