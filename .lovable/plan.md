
# Fix Member Invitation Flow

## Problem Analysis

Currently, the `inviteMember` function in `useOrganizationMembers.ts`:
1. Inserts a record into `organization_members` with `status: pending`
2. Calls `send-invite-email` to send a custom email with a signup link

However, this approach requires the invited user to go through the full signup flow. The requested approach using `auth.admin.inviteUserByEmail()` is better because:
- It creates the user account in Supabase Auth directly
- Sends an email with a secure magic link
- The user just needs to click and set their password

## Solution Overview

Create a new Edge Function `invite-member` that handles the complete invitation flow using Supabase Admin API.

## Implementation Steps

### Step 1: Create `invite-member` Edge Function

**Location**: `supabase/functions/invite-member/index.ts`

The function will:
- Receive `{ email, displayName, organizationId }` from frontend
- Use service role key to call `supabase.auth.admin.inviteUserByEmail()`
- Insert/update the `organization_members` record with `status: pending`
- The invite email will be sent through the existing `auth-email-hook` (branded Resend emails)

```text
Request Body:
{
  email: string,
  displayName: string, 
  organizationId: string
}

Response:
{
  success: boolean,
  memberId?: string,
  error?: string
}
```

### Step 2: Update `supabase/config.toml`

Add the new function configuration:
```toml
[functions.invite-member]
enabled = true
verify_jwt = false
```

### Step 3: Update `useOrganizationMembers.ts`

Simplify the `inviteMember` function to:
1. Call the new `invite-member` edge function
2. Handle success/error responses
3. Refresh the members list

The frontend no longer needs to:
- Manually insert into `organization_members`
- Call `send-invite-email` separately

## Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/invite-member/index.ts` | Create new |
| `supabase/config.toml` | Add function config |
| `src/hooks/useOrganizationMembers.ts` | Simplify inviteMember |

## Technical Details

### Edge Function Flow

```text
Frontend                    invite-member                 Supabase Auth
    |                             |                             |
    |-- POST {email, name, org} ->|                             |
    |                             |-- inviteUserByEmail() ----->|
    |                             |                             |
    |                             |<-- user created ------------|
    |                             |                             |
    |                             |-- INSERT organization_members
    |                             |                             |
    |<-- { success: true } -------|                             |
    |                             |                             |
    |                       auth-email-hook <-- email event ----|
    |                             |                             |
    |                       (branded email sent via Resend)     |
```

### Key Implementation Points

1. **Service Role Client**: Use `SUPABASE_SERVICE_ROLE_KEY` to create an admin client
2. **Redirect URL**: Set to `https://ai-sprint.mondayease.com/auth` for password setup
3. **User Metadata**: Pass `full_name` in user metadata for personalized emails
4. **Duplicate Handling**: Check if email already exists in organization before inviting
5. **Error Handling**: Return clear error messages for duplicate emails, invalid data, etc.

## Cleanup

The `send-invite-email` edge function can be kept for potential future use (resending invites) or removed later. For now, it won't be called by the new flow.
