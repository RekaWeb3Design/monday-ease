

# Fix Email Delivery Issues

## Problem Analysis

After investigation, I found two separate email systems:

1. **Invite Emails** (Edge Function) - Actually working correctly based on logs showing `Email sent successfully` with Resend IDs
2. **Registration Confirmation Emails** (Supabase Auth SMTP) - Using Supabase's built-in email system, which may have configuration issues

---

## Solution Overview

Replace Supabase Auth's built-in email with custom branded emails sent through Resend for both registration confirmations and invites. This gives you full control over email delivery and branding.

---

## Implementation Steps

### Step 1: Create Custom Email Auth Hook Edge Function

Create a new edge function `auth-email-hook` that intercepts Supabase Auth email events and sends branded emails via Resend.

**Location**: `supabase/functions/auth-email-hook/index.ts`

This function will:
- Listen for auth email events (signup confirmation, password reset, magic link)
- Generate branded HTML emails with MondayEase logo and styling
- Send via Resend API using verified `mondayease.com` domain

### Step 2: Update send-invite-email Edge Function

Ensure the invite email function is using the latest branded template with proper error handling.

### Step 3: Configure Supabase Auth Hook Secret

You'll need to create a secret called `SEND_EMAIL_HOOK_SECRET` in Supabase that the auth system uses to sign webhook payloads.

### Step 4: Enable Auth Hook in Supabase Dashboard

After deployment, configure the Auth Hook in Supabase Dashboard:
- Go to Authentication > Hooks
- Enable "Send Email" hook
- Point to your `auth-email-hook` edge function

---

## Technical Details

### New Files to Create

```text
supabase/functions/auth-email-hook/index.ts
```

### Files to Update

```text
supabase/config.toml - Add auth-email-hook function
```

### Edge Function Structure

The auth-email-hook will handle three email types:
- **signup** - Email confirmation for new registrations
- **magiclink** - Passwordless login links  
- **recovery** - Password reset emails

Each email type will use the same branded template with the MondayEase logo, green (#01cb72) accent colors, and consistent styling.

### Email Template Features

- MondayEase logo at top (hosted in email-assets bucket)
- Card-based layout matching invite email
- Green CTA buttons
- Responsive design for mobile
- Clear fallback URL links
- Professional footer

---

## Verification Steps

After implementation:
1. Test new user registration - should receive branded confirmation email
2. Test password reset - should receive branded reset email
3. Test member invite - should receive branded invite email
4. Check Resend dashboard for delivery status

---

## Required Manual Step

After I deploy the edge function, you'll need to:
1. Go to Supabase Dashboard > Authentication > Hooks
2. Enable "Send Email" hook
3. Enter the hook URL and secret

I'll provide exact instructions after deployment.

