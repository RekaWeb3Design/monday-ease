

## Multi-tenant Support - Organizations Implementation

### Overview
Implement organization support in the app, allowing users to create organizations during onboarding and track their membership role. This builds the foundation for future team collaboration features.

---

### Architecture Flow

```text
User Login Flow:
┌──────────┐     ┌─────────────────┐     ┌───────────────────┐
│  /auth   │────>│ ProtectedRoute  │────>│ RequireOrganization│
│  (login) │     │ (checks user)   │     │ (checks org)       │
└──────────┘     └─────────────────┘     └───────────────────┘
                          │                        │
                          │                        │
                          ▼                        ▼
                   No user?              No organization?
                   Redirect to /auth     Redirect to /onboarding
                          │                        │
                          │                        │
                          ▼                        ▼
                   Has user + org? ─────────> Dashboard
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add Organization, OrganizationMember types, update AuthContextType |
| `src/contexts/AuthContext.tsx` | Modify | Add organization fetching, createOrganization function |
| `src/components/auth/RequireOrganization.tsx` | Create | Guard component for org-required routes |
| `src/pages/Onboarding.tsx` | Create | Organization setup page |
| `src/App.tsx` | Modify | Add onboarding route, wrap dashboard with RequireOrganization |
| `src/pages/Dashboard.tsx` | Modify | Display organization name and member role badge |

---

### Implementation Details

#### 1. Update Types (src/types/index.ts)

Add new interfaces for organizations:

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  monday_workspace_id: string | null;
  settings: Record<string, any> | null;
  max_members: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'disabled';
  display_name: string | null;
  email: string;
  invited_at: string | null;
  joined_at: string | null;
}

export type MemberRole = 'owner' | 'admin' | 'member';
```

Update `AuthContextType` to include:
- `organization: Organization | null`
- `memberRole: MemberRole | null`
- `createOrganization: (name: string) => Promise<Organization>`
- `refreshOrganization: () => Promise<void>`

---

#### 2. Update AuthContext (src/contexts/AuthContext.tsx)

**New State:**
- `organization: Organization | null`
- `memberRole: MemberRole | null`

**New Functions:**

`fetchOrganization(userId: string)`:
1. First check if user owns an organization via `organizations` table where `owner_id = userId`
2. If found, set organization and role = 'owner'
3. If not found, check `organization_members` table for active membership
4. If membership found, set organization and role from membership

`createOrganization(name: string)`:
1. Generate slug from name (lowercase, replace non-alphanumeric with hyphens, append timestamp)
2. Insert into `organizations` table
3. Insert owner record into `organization_members`
4. Update `user_profiles.primary_organization_id`
5. Update local state

`refreshOrganization()`:
- Re-fetch organization data (useful after updates)

**Integration:**
- Call `fetchOrganization` after profile is loaded in the auth state listener
- Expose `organization`, `memberRole`, `createOrganization`, `refreshOrganization` in context value

---

#### 3. Create RequireOrganization Component

**Location:** `src/components/auth/RequireOrganization.tsx`

**Behavior:**
- Uses `useAuth()` to get `organization` and `loading`
- If loading: show centered spinner
- If no organization: redirect to `/onboarding`
- Otherwise: render children

This component separates concerns from ProtectedRoute (which handles auth) and allows for clean routing logic.

---

#### 4. Create Onboarding Page

**Location:** `src/pages/Onboarding.tsx`

**Design (matching Auth page style):**
- Centered layout with max-width 400px
- MondayEase logo (180px width) at top
- Heading: "Create Your Organization"
- Subtext: "Set up your workspace to start inviting team members"
- Single input field for organization name
- Create button using primary green (#01cb72)
- Loading state during creation
- Error handling with displayed messages
- On success: redirect to `/`

**If user already has an organization:** redirect to `/` immediately via useEffect

---

#### 5. Update App.tsx Routing

**New Route Structure:**
```typescript
<Route path="/auth" element={<Auth />} />
<Route path="/onboarding" element={
  <ProtectedRoute>
    <Onboarding />
  </ProtectedRoute>
} />
<Route path="/" element={
  <ProtectedRoute>
    <RequireOrganization>
      <AppLayout pageTitle="Dashboard">
        <Dashboard />
      </AppLayout>
    </RequireOrganization>
  </ProtectedRoute>
} />
```

This ensures:
1. Unauthenticated users go to /auth
2. Authenticated users without org go to /onboarding
3. Authenticated users with org access dashboard

---

#### 6. Update Dashboard

**Changes:**
- Import `organization` and `memberRole` from `useAuth()`
- Update welcome header to show organization name: "Welcome to {organization.name}"
- Add a small role badge next to user name showing their role (Owner/Admin/Member)
- Use appropriate badge colors:
  - Owner: green background
  - Admin: blue background  
  - Member: gray background

---

### Database Compatibility

The existing Supabase schema already has:
- `organizations` table with proper columns (name, slug, owner_id, etc.)
- `organization_members` table with role, status, etc.
- RLS policies allowing:
  - Owners to manage their organizations
  - Members to view organizations they belong to
  - Owners to manage organization members

No database migrations are required for this implementation.

---

### User Flow Summary

1. **New User Signs Up** -> Email confirmation -> Sign In
2. **First Login** -> ProtectedRoute passes -> RequireOrganization redirects to `/onboarding`
3. **Onboarding** -> User enters org name -> Create Organization
4. **Organization Created** -> User is set as owner -> Redirect to Dashboard
5. **Future Logins** -> Organization is fetched automatically -> Direct access to Dashboard

---

### Edge Cases Handled

- User refreshes page during onboarding: stays on onboarding (session persists, org check runs)
- User tries to access dashboard directly without org: redirected to onboarding
- User already has org and visits /onboarding: redirected to dashboard
- Organization creation fails: error message displayed, user can retry

