import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;

// Logo URL from storage bucket
const LOGO_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/storage/v1/object/public/email-assets/mondayease-logo.png?v=1";

interface EmailPayload {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

function generateEmailHtml(
  type: "signup" | "recovery" | "magiclink" | "email_change",
  email: string,
  confirmUrl: string,
  displayName?: string
): string {
  const name = displayName || email.split("@")[0];
  
  const configs = {
    signup: {
      title: "Confirm your email",
      emoji: "✉️",
      message: `Thanks for signing up! Please confirm your email address to get started with MondayEase.`,
      buttonText: "Confirm Email",
      footerNote: "If you didn't create an account, you can safely ignore this email.",
    },
    recovery: {
      title: "Reset your password",
      emoji: "🔐",
      message: `We received a request to reset your password. Click the button below to choose a new password.`,
      buttonText: "Reset Password",
      footerNote: "If you didn't request a password reset, you can safely ignore this email.",
    },
    magiclink: {
      title: "Your login link",
      emoji: "🔗",
      message: `Click the button below to log in to your MondayEase account. This link will expire in 1 hour.`,
      buttonText: "Log In",
      footerNote: "If you didn't request this link, you can safely ignore this email.",
    },
    email_change: {
      title: "Confirm email change",
      emoji: "📧",
      message: `You requested to change your email address. Click the button below to confirm this change.`,
      buttonText: "Confirm Email Change",
      footerNote: "If you didn't request this change, please contact support immediately.",
    },
  };

  const config = configs[type] || configs.signup;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto;">
          
          <!-- Logo Section -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <img src="${LOGO_URL}" alt="MondayEase" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 48px 40px;">
                    
                    <!-- Emoji & Title -->
                    <div style="text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 48px; line-height: 1;">${config.emoji}</span>
                    </div>
                    
                    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.3;">
                      ${config.title}
                    </h1>
                    
                    <!-- Greeting -->
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #4a4a4a; text-align: center; line-height: 1.6;">
                      Hi <strong style="color: #01cb72;">${name}</strong>,
                    </p>
                    
                    <!-- Message -->
                    <p style="margin: 0 0 32px 0; font-size: 16px; color: #4a4a4a; text-align: center; line-height: 1.6;">
                      ${config.message}
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${confirmUrl}" 
                         style="display: inline-block; background-color: #01cb72; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px; box-shadow: 0 4px 14px rgba(1, 203, 114, 0.4);">
                        ${config.buttonText}
                      </a>
                    </div>
                    
                    <!-- Divider -->
                    <div style="border-top: 1px solid #e5e5e5; margin: 24px 0;"></div>
                    
                    <!-- Fallback Link -->
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; text-align: center;">
                      Button not working? Copy and paste this link:
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #01cb72; text-align: center; word-break: break-all;">
                      <a href="${confirmUrl}" style="color: #01cb72; text-decoration: underline;">${confirmUrl}</a>
                    </p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
                ${config.footerNote}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} MondayEase. Streamline your Monday.com experience.
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
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  console.log("Auth email hook received request");

  try {
    const wh = new Webhook(hookSecret);
    const data = wh.verify(payload, headers) as EmailPayload;

    const { user, email_data } = data;
    const { token_hash, redirect_to, email_action_type, site_url } = email_data;

    console.log(`Processing ${email_action_type} email for ${user.email}`);

    // Build the confirmation URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || site_url;
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    // Determine email type
    let emailType: "signup" | "recovery" | "magiclink" | "email_change" = "signup";
    let subject = "Confirm your email - MondayEase";

    switch (email_action_type) {
      case "signup":
      case "email":
        emailType = "signup";
        subject = "Confirm your email - MondayEase";
        break;
      case "recovery":
        emailType = "recovery";
        subject = "Reset your password - MondayEase";
        break;
      case "magiclink":
        emailType = "magiclink";
        subject = "Your login link - MondayEase";
        break;
      case "email_change":
        emailType = "email_change";
        subject = "Confirm email change - MondayEase";
        break;
      default:
        console.log(`Unknown email action type: ${email_action_type}, defaulting to signup`);
    }

    const displayName = user.user_metadata?.full_name;
    const html = generateEmailHtml(emailType, user.email, confirmUrl, displayName);

    const { data: emailResult, error } = await resend.emails.send({
      from: "MondayEase <noreply@mondayease.com>",
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email via Resend:", error);
      throw error;
    }

    console.log(`Email sent successfully: ${emailResult?.id}`);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in auth-email-hook:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || "Unknown error",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
