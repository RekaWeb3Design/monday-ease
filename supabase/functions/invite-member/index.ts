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

    // Fetch organization name for personalized email
    const { data: orgData } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    const orgName = orgData?.name || "a team";

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

    // Step 2: Generate password recovery link
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

    // Extract the recovery link from the response
    const recoveryLink = linkData.properties?.action_link;

    if (!recoveryLink) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from("organization_members").delete().eq("id", newMember.id);
      console.error("No action_link in generateLink response");
      return jsonResponse({ error: "Failed to generate recovery link" }, 500);
    }

    // Step 3: Send invitation email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      // Don't cleanup - user exists, they can use "Forgot Password" as backup
      return jsonResponse({ success: true, memberId: newMember.id, warning: "Email not sent - API key missing" });
    }

    const logoUrl = "https://yqjugovqhvxoxvrceqqp.supabase.co/storage/v1/object/public/email-assets/mondayease-logo.png?v=1";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MondayEase <noreply@mondayease.com>",
        to: normalizedEmail,
        subject: `You're invited to join ${orgName} on MondayEase`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                      <!-- Header -->
                      <tr>
                        <td style="background-color: #1a1a2e; padding: 32px; text-align: center;">
                          <img src="${logoUrl}" alt="MondayEase" width="180" style="display: block; margin: 0 auto;">
                        </td>
                      </tr>
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 32px;">
                          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a2e;">You're Invited!</h1>
                          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a68;">
                            Hi ${displayName.trim()},<br><br>
                            You've been invited to join <strong>${orgName}</strong> on MondayEase. Click the button below to set up your password and access your account.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" style="padding: 16px 0;">
                                <a href="${recoveryLink}" style="display: inline-block; background-color: #01cb72; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px;">
                                  Set Up Your Account
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                            If you weren't expecting this invitation, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8f8fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e8e8ec;">
                          <p style="margin: 0; font-size: 12px; color: #9090a0;">
                            © 2025 MondayEase. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email send error:", errorText);
      // Don't cleanup - user exists, they can use "Forgot Password" as backup
      return jsonResponse({ success: true, memberId: newMember.id, warning: "User created but email failed to send" });
    }

    console.log(`Invitation email sent to ${email} for org ${organizationId}`);
    
    return jsonResponse({ success: true, memberId: newMember.id });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
