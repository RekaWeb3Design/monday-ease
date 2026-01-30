import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  displayName: string;
  organizationName: string;
  inviterName: string;
}

// Using the published app's logo - publicly accessible
const LOGO_URL = "https://ease-hub-dash.lovable.app/lovable-uploads/db0b20ac-1fbb-4f3b-a685-4bfe47d3d7d1.png";

function generateInviteEmailHtml(
  displayName: string,
  organizationName: string,
  inviterName: string,
  signUpUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <!-- Logo Section -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="${LOGO_URL}" width="180" alt="MondayEase" style="display: block; max-width: 180px; height: auto;">
            </td>
          </tr>
          
          <!-- Main Content Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
              <!-- Heading -->
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 24px; padding: 0;">
                Welcome to the team! 🎉
              </h1>
              
              <!-- Greeting -->
              <p style="color: #4a5568; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
                Hi <strong>${displayName}</strong>,
              </p>
              
              <!-- Invite Message -->
              <p style="color: #4a5568; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
                ${inviterName || 'A team member'} has invited you to join <strong style="color: #01cb72;">${organizationName}</strong> on MondayEase.
              </p>
              
              <!-- Description -->
              <p style="color: #4a5568; font-size: 16px; line-height: 26px; margin: 0 0 32px;">
                MondayEase streamlines your Monday.com experience by showing you only the tasks and boards that matter to you. No noise, just your work.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${signUpUrl}" style="display: inline-block; background-color: #01cb72; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #718096; font-size: 14px; text-align: center; margin: 0 0 8px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #01cb72; font-size: 13px; text-align: center; word-break: break-all; margin: 0;">
                <a href="${signUpUrl}" style="color: #01cb72;">${signUpUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                    <p style="color: #a0aec0; font-size: 12px; line-height: 20px; text-align: center; margin: 0 0 4px;">
                      This invitation was sent by ${organizationName}.
                    </p>
                    <p style="color: #a0aec0; font-size: 12px; line-height: 20px; text-align: center; margin: 0 0 16px;">
                      If you didn't expect this email, you can safely ignore it.
                    </p>
                    <p style="color: #a0aec0; font-size: 12px; text-align: center; margin: 0;">
                      © ${new Date().getFullYear()} MondayEase. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, displayName, organizationName, inviterName }: InviteRequest = await req.json();

    // Validate required fields
    if (!email || !displayName || !organizationName) {
      console.error("Missing required fields:", { email, displayName, organizationName });
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, displayName, organizationName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://ai-sprint.mondayease.com";
    const signUpUrl = `${siteUrl}/auth?mode=signup&email=${encodeURIComponent(email)}`;

    console.log("Sending invite email to:", email);
    console.log("Organization:", organizationName);
    console.log("Sign up URL:", signUpUrl);

    const html = generateInviteEmailHtml(displayName, organizationName, inviterName, signUpUrl);

    // Send email using Resend REST API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MondayEase <noreply@mondayease.com>",
        to: [email],
        subject: `You've been invited to join ${organizationName} on MondayEase`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({ error: result.message || "Failed to send email" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-invite-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
