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
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #01cb72; margin-bottom: 10px;">MondayEase</h1>
              </div>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #111827;">Hi ${displayName}!</h2>
                
                <p style="color: #4b5563;">
                  ${inviterName || "A team member"} has invited you to join <strong>${organizationName}</strong> on MondayEase.
                </p>
                
                <p style="color: #4b5563;">
                  MondayEase streamlines your Monday.com experience by showing you only the tasks and boards relevant to you.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signUpUrl}" 
                     style="display: inline-block; background-color: #01cb72; color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${signUpUrl}" style="color: #01cb72;">${signUpUrl}</a>
                </p>
              </div>
              
              <div style="text-align: center; color: #9ca3af; font-size: 12px;">
                <p>
                  This invitation was sent by ${organizationName}.<br>
                  If you didn't expect this email, you can safely ignore it.
                </p>
                <p>&copy; ${new Date().getFullYear()} MondayEase. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
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
