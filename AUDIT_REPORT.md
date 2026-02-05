# MondayEase v2 - Full Technical Audit Report

**Audit Date:** 2026-02-05
**App URL:** https://ai-sprint.mondayease.com
**Supabase Project:** yqjugovqhvxoxvrceqqp
**GitHub Repo:** RekaWeb3Design/monday-ease

---

## DATABASE AUDIT RESULTS

### 1.1 Table Inventory (from migrations and types.ts)

| Table | Column Count | Description |
|-------|--------------|-------------|
| board_configs | 12 | Monday.com board configurations with filter settings |
| custom_board_views | 14 | Custom dashboard views with selected columns |
| member_board_access | 6 | Links members to boards with filter values |
| organization_members | 9 | Organization team members (owners, admins, members) |
| organizations | 9 | Organization entities owned by users |
| user_integrations | 14 | OAuth integrations (Monday.com connections) |
| user_profiles | 8 | User profile data including user_type |
| workflow_executions | 13 | Workflow execution history |
| workflow_templates | 13 | n8n webhook workflow templates |

### 1.2 Board Configs Schema Analysis

From `src/integrations/supabase/types.ts`:
```typescript
board_configs: {
  id: string                    // UUID primary key
  organization_id: string       // FK to organizations
  monday_board_id: string       // Monday.com board ID
  board_name: string            // Display name
  filter_column_id: string | null     // Column used for filtering
  filter_column_name: string | null   // Human-readable column name
  filter_column_type: string | null   // Column type (people, text, status)
  visible_columns: Json | null        // Array of visible column IDs
  is_active: boolean | null           // Soft active status
  monday_account_id: string | null    // For multi-account support
  workspace_name: string | null       // Monday workspace name
  created_at: string | null
  updated_at: string | null
}
```

**filter_column_type Status:**
- Field exists and is properly defined in schema
- AddBoardDialog.tsx:174 saves `filterColumn?.type` correctly
- EditBoardDialog.tsx:149 also saves the type correctly
- useBoardConfigs.ts handles both create and update operations for this field

### 1.3 Organization Members Schema

```typescript
organization_members: {
  id: string                    // UUID primary key
  organization_id: string       // FK to organizations
  user_id: string | null        // FK to auth.users (null for pending invites)
  email: string                 // Member email
  display_name: string | null   // Display name
  role: string                  // 'owner' | 'admin' | 'member'
  status: string                // 'active' | 'pending' | 'disabled'
  invited_at: string | null     // When invitation was sent
  joined_at: string | null      // When member activated
}
```

### 1.4 RLS Policies (from migrations)

**custom_board_views policies:**
1. `Org owners can manage views` - ALL operations for organization owners
2. `Org members can view` - SELECT for active organization members

**Note:** Other tables' RLS policies are not visible in the migrations directory but are likely configured in the Supabase dashboard.

### 1.5 Database Queries to Run Manually

Execute these in Supabase SQL Editor:

```sql
-- 1.1 Table inventory
SELECT table_name,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 1.2 Board configs with null filter_column_type
SELECT id, board_name, filter_column_id, filter_column_name, filter_column_type,
  monday_board_id, monday_account_id
FROM board_configs;

SELECT
  count(*) as total,
  count(filter_column_type) as has_type,
  count(*) - count(filter_column_type) as null_type
FROM board_configs;

-- 1.3 Duplicate organization members check
SELECT user_id, organization_id, count(*)
FROM organization_members
GROUP BY user_id, organization_id
HAVING count(*) > 1;

-- 1.4 Orphaned member_board_access records
SELECT mba.* FROM member_board_access mba
LEFT JOIN board_configs bc ON bc.id = mba.board_config_id
LEFT JOIN organization_members om ON om.id = mba.member_id
WHERE bc.id IS NULL OR om.id IS NULL;

-- 1.5 All RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## EDGE FUNCTION AUDIT RESULTS

### 2.1 Deployed Edge Functions

| Function | File | Status |
|----------|------|--------|
| get-board-view-data | `supabase/functions/get-board-view-data/index.ts` | Deployed |
| get-member-tasks | `supabase/functions/get-member-tasks/index.ts` | Deployed |
| get-monday-users | `supabase/functions/get-monday-users/index.ts` | Deployed |
| _shared | `supabase/functions/_shared/` | Shared utilities |

### 2.2 Missing Edge Functions

| Function | Expected | Actual |
|----------|----------|--------|
| invite-member | Expected for email sending | **DOES NOT EXIST** |
| configure-board | Expected for board config | **DOES NOT EXIST** - handled client-side |
| monday-oauth-callback | Referenced in useMondayOAuth.ts | **NOT IN LOCAL REPO** |

### 2.3 Function-by-Function Analysis

#### _shared/auth.ts
- Properly validates Authorization header
- Creates user-scoped Supabase client with auth token
- Creates admin client with service role key
- Custom AuthError class for proper error handling

#### _shared/cors.ts
- CORS headers allow all origins (`*`)
- Includes necessary headers for Supabase client
- Has `jsonResponse()` and `corsPreflightResponse()` helpers

#### _shared/monday.ts
- AES-GCM token decryption implementation
- Graceful fallback if decryption fails (assumes plaintext)
- Monday.com GraphQL API wrapper with proper headers
- **No refresh token logic** - This is correct since Monday.com tokens don't expire

#### get-board-view-data/index.ts
- JWT verification via shared auth module
- Proper access control (owner OR active member)
- Uses owner's Monday token for API calls
- Handles double-encoded JSON for legacy data
- Pagination, search, and sorting implemented

#### get-member-tasks/index.ts
- JWT verification via shared auth module
- Owner can view any member's tasks; members view only their own
- Person column handling:
  - Extracts from `text`, `label`, and `value.personsAndTeams`
  - Case-insensitive matching
  - Handles comma-separated names
  - **Person ID matching included** (line 58-60)

#### get-monday-users/index.ts
- JWT verification via shared auth module
- Owner-only access restriction
- Simple GraphQL query for users list

### 2.4 supabase/config.toml Analysis

```toml
project_id = "yqjugovqhvxoxvrceqqp"

[functions.get-member-tasks]
verify_jwt = false

[functions.get-monday-users]
verify_jwt = false

[functions.get-board-view-data]
verify_jwt = false
```

**Analysis:** `verify_jwt = false` disables Supabase's automatic JWT verification, but all functions implement manual JWT verification via `getAuthenticatedContext()` in `_shared/auth.ts`. This is intentional and correct.

### 2.5 Email Sending (Resend) Analysis

**Finding: NO EMAIL SENDING IS IMPLEMENTED**

- No `invite-member` edge function exists
- No Resend SDK imports anywhere in the codebase
- The `inviteMember()` function in `useOrganizationMembers.ts` (lines 69-103):
  - Creates a record with `status: 'pending'` directly in `organization_members` table
  - Shows a toast saying "Invitation Sent" but NO actual email is sent
  - The invite flow is **client-side only**

The SEND_EMAIL_HOOK_SECRET provided would be used for Supabase Auth email hooks, not for Resend integration.

---

## FRONTEND AUDIT RESULTS

### 3.1 Routing Structure

| Path | Component | Protection |
|------|-----------|------------|
| `/auth` | Auth.tsx | Public |
| `/onboarding` | Onboarding.tsx | ProtectedRoute |
| `/` | DashboardRedirect | ProtectedRoute + RequireOrganization |
| `/member` | MemberDashboard | ProtectedRoute + RequireOrganization |
| `/organization` | Organization | ProtectedRoute + RequireOrganization |
| `/integrations` | Integrations | ProtectedRoute + RequireOrganization |
| `/boards` | BoardConfig | ProtectedRoute + RequireOrganization |
| `/templates` | Templates | ProtectedRoute + RequireOrganization |
| `/activity` | ExecutionHistory | ProtectedRoute + RequireOrganization |
| `/board-views` | BoardViews | ProtectedRoute + RequireOrganization |
| `/board-views/:slug` | CustomViewPage | ProtectedRoute + RequireOrganization |
| `/oauth-callback` | OAuthCallback | Public |
| `*` | NotFound | Public |

### 3.2 AuthContext Analysis

**user_type handling:** The `user_type` field exists in:
- `src/types/index.ts:8` - In UserProfile interface
- `src/integrations/supabase/types.ts:317` - In database types
- **BUT it is NOT used in AuthContext.tsx or any routing logic**

The app routes based on `memberRole` ('owner' | 'admin' | 'member') instead of `user_type`. The `user_type` field appears to be unused legacy or planned feature.

### 3.3 Hardcoded Values

| File | Line | Value | Assessment |
|------|------|-------|------------|
| client.ts | 5 | SUPABASE_URL | Expected (Lovable generated) |
| client.ts | 6 | SUPABASE_PUBLISHABLE_KEY | Expected (Lovable generated) |
| useMondayOAuth.ts | 7 | REDIRECT_URI with project ID | Expected |
| edge-function.ts | 3 | SUPABASE_FUNCTIONS_URL | Expected |

**Assessment:** All hardcoded values are expected for a Lovable-generated project. The anon key is safe to expose client-side.

### 3.4 filter_column_type Handling

| Component | Saves Type | Location |
|-----------|-----------|----------|
| AddBoardDialog.tsx | Yes | Line 174: `filterColumn?.type` |
| EditBoardDialog.tsx | Yes | Line 149: `filterColumn?.type` |
| useBoardConfigs.ts | Yes | Lines 162, 223-224 |
| EditBoardAccessDialog.tsx | Reads | Line 138, 169 |

**Assessment:** filter_column_type is properly saved when creating/updating board configs.

### 3.5 Invite Flow Analysis

The invite flow in Organization.tsx:
1. User fills email + display name form
2. `inviteMember()` is called (useOrganizationMembers.ts:69)
3. Record inserted to `organization_members` with `status: 'pending'`
4. Toast shows "Invitation Sent"
5. **NO ACTUAL EMAIL IS SENT**

Invited members must:
1. Manually navigate to the app URL
2. Sign up with the same email
3. The system should then link them (but this linking logic also appears incomplete)

---

## CRITICAL ISSUES IDENTIFIED

### CRITICAL: No Email Sending for Invites
**Severity:** HIGH
**Impact:** Invited members receive no notification
**Status:** NOT FIXED (requires Resend integration)

### Issue: user_type Field Unused
**Severity:** LOW
**Impact:** Potential confusion, unused database field
**Status:** Informational only

### Issue: Missing monday-oauth-callback Function
**Severity:** MEDIUM
**Impact:** OAuth callback URL references non-local function
**Note:** May be deployed via Supabase dashboard directly

---

## CRITICAL FIXES APPLIED

### Database Fixes (Run Manually in Supabase SQL Editor)

Since direct database access is not available from this environment, run these fixes manually:

#### Fix 1: Populate null filter_column_type values
```sql
-- Set type based on column name patterns
UPDATE board_configs
SET filter_column_type =
  CASE
    WHEN LOWER(filter_column_name) LIKE '%person%'
      OR LOWER(filter_column_name) LIKE '%assignee%'
      OR LOWER(filter_column_name) LIKE '%agent%'
      OR LOWER(filter_column_name) LIKE '%owner%'
    THEN 'people'
    WHEN LOWER(filter_column_name) LIKE '%status%'
    THEN 'status'
    ELSE 'text'
  END
WHERE filter_column_type IS NULL
  AND filter_column_name IS NOT NULL;
```

#### Fix 2: Remove duplicate organization_members
```sql
-- First identify duplicates
SELECT user_id, organization_id, count(*), array_agg(id ORDER BY invited_at) as ids
FROM organization_members
WHERE user_id IS NOT NULL
GROUP BY user_id, organization_id
HAVING count(*) > 1;

-- Then delete newer duplicates (keep oldest by invited_at)
DELETE FROM organization_members om1
WHERE EXISTS (
  SELECT 1 FROM organization_members om2
  WHERE om2.user_id = om1.user_id
    AND om2.organization_id = om1.organization_id
    AND om2.invited_at < om1.invited_at
);
```

#### Fix 3: Clean orphaned member_board_access records
```sql
-- Delete orphaned records (missing board_config or member)
DELETE FROM member_board_access mba
WHERE NOT EXISTS (
  SELECT 1 FROM board_configs bc WHERE bc.id = mba.board_config_id
)
OR NOT EXISTS (
  SELECT 1 FROM organization_members om WHERE om.id = mba.member_id
);
```

---

## REMAINING ISSUES (Prioritized)

### P0 - Critical (Blocking Features)

1. **No Email Sending for Member Invites**
   - Need to create `invite-member` edge function with Resend integration
   - Need to wire up SEND_EMAIL_HOOK_SECRET for Supabase Auth hooks
   - Alternative: Implement email via Supabase Auth email templates

### P1 - High Priority

2. **Member Activation Flow Incomplete**
   - When invited member signs up, they need to be linked to pending invite
   - Currently requires manual database intervention (see scripts/manual-member-setup.sql)

3. **monday-oauth-callback Function Location**
   - Referenced in useMondayOAuth.ts but not in local repo
   - Verify it's deployed in Supabase dashboard

### P2 - Medium Priority

4. **user_type Field Unused**
   - Consider removing from schema if not needed
   - Or implement role-based routing if planned

5. **Hardcoded URLs**
   - Could be moved to environment variables for flexibility
   - Low priority as they're Lovable-managed

### P3 - Low Priority / Nice-to-Have

6. **Add Unique Constraints**
   - Add unique constraint on `(user_id, organization_id)` in organization_members
   - Prevents duplicate membership programmatically

7. **Add Cascade Deletes**
   - Ensure member_board_access is cleaned when members are deleted
   - Already handled in useBoardConfigs.ts but should be DB-level

---

## RECOMMENDATIONS

### Immediate Actions

1. **Run the database fix queries** above in Supabase SQL Editor
2. **Verify monday-oauth-callback** exists in deployed functions
3. **Create invite-member edge function** for Resend email integration

### Future Improvements

1. Move hardcoded URLs to `.env` variables
2. Add database-level unique constraints
3. Implement proper member linking on signup
4. Consider adding `user_type` to routing logic or remove the field

---

## APPENDIX: Full File Inventory

### Edge Functions
```
supabase/functions/
├── _shared/
│   ├── auth.ts
│   ├── cors.ts
│   └── monday.ts
├── get-board-view-data/
│   └── index.ts
├── get-member-tasks/
│   └── index.ts
└── get-monday-users/
    └── index.ts
```

### Key Frontend Files
```
src/
├── App.tsx                    # Main routing
├── contexts/AuthContext.tsx   # Auth state management
├── hooks/
│   ├── useBoardConfigs.ts     # Board CRUD operations
│   └── useOrganizationMembers.ts # Member management
├── pages/
│   ├── BoardConfig.tsx        # Board configuration UI
│   └── Organization.tsx       # Member management UI
└── components/boards/
    ├── AddBoardDialog.tsx     # Create board config
    └── EditBoardDialog.tsx    # Edit board config
```

### Database Migrations
```
supabase/migrations/
├── 20260130032421_*.sql       # Add filter_column_type
├── 20260130110439_*.sql       # Create custom_board_views
├── 20260130111958_*.sql       # Fix double-encoded JSON
├── 20260203205244_*.sql       # Add monday_account_id
├── 20260203224118_*.sql       # Add workspace_name
└── 20260203225156_*.sql       # Backfill workspace_name
```

---

*Report generated by Claude Code Audit*
