

# Fix Member Activation RLS Issue

## Problem Summary
When an invited member logs in, the `AuthContext.handleInvitedMemberActivation` function tries to query `organization_members` to find and activate their pending membership. However, the RLS policies block this:

- **Policy**: "Users view own membership" requires `auth.uid() = user_id`
- **Problem**: For pending invites, `user_id` is NULL (only `email` is set)
- **Result**: 403 Forbidden errors when the invited user tries to access their own pending record

## Solution

Create a new `activate-invited-member` Edge Function that bypasses RLS using the service role key, then update AuthContext to call this function instead of making direct database queries.

---

## Implementation Tasks

### Task 1: Create activate-invited-member Edge Function

**File:** `supabase/functions/activate-invited-member/index.ts`

**Logic:**
1. Validate the Authorization header (JWT)
2. Extract user ID and email from the JWT using `getClaims()`
3. Check if user has `invited_to_organization` in their metadata
4. Use service_role client to find the pending membership by email and organization
5. Activate the membership: set `user_id`, `status = 'active'`, `joined_at`
6. Update `user_profiles`: set `user_type = 'member'`, `primary_organization_id`
7. Return success/error response

**Pattern:** Follow the same structure as the existing `invite-member` function:
- CORS headers
- JWT validation with `getClaims()`
- Service role client for privileged operations
- Comprehensive error handling and logging

---

### Task 2: Update supabase/config.toml

Add the new function configuration:

```toml
[functions.activate-invited-member]
verify_jwt = false
```

---

### Task 3: Update AuthContext.tsx

Modify `handleInvitedMemberActivation` to call the Edge Function instead of direct Supabase queries:

**Before (current - fails with 403):**
```typescript
const { data: pendingMember } = await supabase
  .from("organization_members")
  .select("id")
  .eq("organization_id", orgId)
  .eq("email", currentUser.email!)
  .eq("status", "pending")
  .maybeSingle();
```

**After (new - calls Edge Function):**
```typescript
const { data, error } = await supabase.functions.invoke('activate-invited-member');

if (error || !data?.success) {
  console.error("Activation failed:", error || data?.error);
  return false;
}

console.log("Invited member activated via Edge Function");
return true;
```

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/functions/activate-invited-member/index.ts` | Edge Function for member activation |
| Update | `supabase/config.toml` | Add function config with `verify_jwt = false` |
| Update | `src/contexts/AuthContext.tsx` | Replace direct queries with Edge Function call |

---

## Edge Function Details

### Input
No request body needed - the function extracts everything from the JWT:
- User ID: `claims.sub`
- User Email: `claims.email`
- Invited Organization: From user metadata (fetched via `auth.admin.getUserById`)

### Output
```json
{
  "success": true,
  "message": "Membership activated successfully",
  "organization_id": "uuid",
  "organization_name": "Org Name"
}
```

Or on error:
```json
{
  "success": false,
  "error": "No pending membership found"
}
```

### Security
- JWT is validated server-side using `getClaims()`
- Service role client bypasses RLS only for the specific activation operation
- Function only activates memberships that match the authenticated user's email

---

## Flow After Fix

```text
1. Owner invites member@example.com
   -> invite-member creates pending record (user_id = NULL)

2. Member receives email, clicks link, sets password

3. Member logs in
   -> AuthContext detects invited_to_organization metadata
   -> Calls activate-invited-member Edge Function

4. Edge Function (with service_role):
   -> Finds pending membership by email
   -> Sets user_id, status='active', joined_at
   -> Updates user_profiles

5. AuthContext:
   -> fetchOrganization() now succeeds (RLS allows user_id = auth.uid())
   -> Member is redirected to /member dashboard
```

---

## Execution Order

1. Create the Edge Function file
2. Update `supabase/config.toml`
3. Deploy Edge Function (automatic)
4. Update `AuthContext.tsx` to call the function
5. Test the full invited member flow

