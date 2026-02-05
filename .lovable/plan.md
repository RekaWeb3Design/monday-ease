

# Fix: Send Invitation Email via Resend

## Problem

The `adminClient.auth.admin.generateLink()` function only **generates** the password recovery link but does **not send an email**. The current comment at line 121-122 incorrectly assumes it triggers the auth-email-hook.

Result: Invited users never receive their invitation email.

---

## Solution

After generating the link, manually send the invitation email using the Resend API with MondayEase branding.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/invite-member/index.ts` | UPDATE | Add Resend email sending after generateLink |

---

## Implementation

### Update `invite-member/index.ts` (Lines 105-125)

After the `generateLink` call succeeds, extract the action link and send a branded email:

```typescript
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
    subject: "You're invited to join MondayEase",
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
                        You've been invited to join a team on MondayEase. Click the button below to set up your password and access your account.
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
```

---

## Email Design

The invitation email follows MondayEase branding:
- Dark header with logo
- Primary green (#01cb72) CTA button
- Clean, professional layout
- Personalized greeting with the member's display name
- Clear call-to-action

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No recovery link in response | Full cleanup, return error |
| RESEND_API_KEY missing | User created (can use Forgot Password), warning returned |
| Email fails to send | User created (can use Forgot Password), warning returned |
| Email sends successfully | Full success response |

---

## Prerequisites

The `RESEND_API_KEY` secret is already configured in the project.

The logo should be uploaded to the `email-assets` storage bucket. If not present, the email will still work but without the logo image.

---

## Files Changed

| File | Lines Changed | Description |
|------|---------------|-------------|
| `supabase/functions/invite-member/index.ts` | ~70 lines added | Add email extraction and Resend sending |

