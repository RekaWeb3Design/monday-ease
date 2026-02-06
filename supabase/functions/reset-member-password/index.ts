import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);
    const callerId = user.id;

    const { memberId, organizationId } = await req.json();

    if (!memberId || !organizationId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    console.log(`Password reset requested by ${callerId} for member ${memberId}`);

    // Verify caller is org owner
    const { data: callerMembership, error: callerError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", callerId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (callerError || !callerMembership || callerMembership.role !== "owner") {
      console.error("Authorization failed:", callerError || "Not an owner");
      return jsonResponse({ error: "Only owners can reset member passwords" }, 403);
    }

    // Fetch the member to reset
    const { data: member, error: memberError } = await adminClient
      .from("organization_members")
      .select("id, email, display_name, user_id, organization_id")
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !member) {
      console.error("Member not found:", memberError);
      return jsonResponse({ error: "Member not found" }, 404);
    }

    if (!member.user_id) {
      return jsonResponse({ error: "Member has not activated their account yet. Please resend the invitation instead." }, 400);
    }

    // Get organization name for email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    const orgName = org?.name || "your organization";

    // Generate password recovery link
    const siteUrl = Deno.env.get("SITE_URL") || "https://ease-hub-dash.lovable.app";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: member.email,
      options: {
        redirectTo: `${siteUrl}/auth`,
      },
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      return jsonResponse({ error: "Failed to generate reset link" }, 500);
    }

    const recoveryLink = linkData.properties?.action_link;

    if (!recoveryLink) {
      console.error("No action_link in response:", linkData);
      return jsonResponse({ error: "Failed to generate recovery link" }, 500);
    }

    console.log("Recovery link generated for:", member.email);

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return jsonResponse({ error: "Email service not configured" }, 500);
    }

    const displayName = member.display_name || member.email.split("@")[0];
    const logoUrl = "https://yqjugovqhvxoxvrceqqp.supabase.co/storage/v1/object/public/email-assets/mondayease-logo.png?v=1";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 32px 40px; text-align: center;">
              <img src="${logoUrl}" alt="MondayEase" style="height: 40px; width: auto;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #1a1a2e;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Your organization admin at <strong>${orgName}</strong> has requested a password reset for your MondayEase account.
              </p>
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                Click the button below to set a new password:
              </p>
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto 32px;">
                <tr>
                  <td style="background-color: #01cb72; border-radius: 8px;">
                    <a href="${recoveryLink}" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #888888;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.6; color: #01cb72; word-break: break-all;">
                ${recoveryLink}
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #888888;">
                <strong>Security Notice:</strong> If you didn't expect this email or believe it was sent in error, please contact your organization administrator immediately.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #888888;">
                © ${new Date().getFullYear()} MondayEase. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MondayEase <noreply@mondayease.com>",
        to: member.email,
        subject: "Reset Your MondayEase Password",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Email send error:", errorText);
      return jsonResponse({ error: "Failed to send reset email" }, 500);
    }

    console.log("Password reset email sent to:", member.email);

    return jsonResponse({ success: true });

  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
