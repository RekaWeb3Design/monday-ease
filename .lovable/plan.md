

## Organization Management UI Implementation

### Overview
Create a full-featured Organization management page where owners can view and manage team members, invite new members, and edit member details.

---

### Architecture

```text
Organization Page Structure:
┌─────────────────────────────────────────────────────────────────┐
│  Organization Header                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Organization Name] [Edit Button]                        │   │
│  │ 3 / 10 members [Progress Bar]                           │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Team Members Section                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ "Team Members"          [Invite Member Button]           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Name    │ Email         │ Role   │ Status │ Actions    │   │
│  │ John D. │ john@...      │ Owner  │ Active │ You        │   │
│  │ Jane S. │ jane@...      │ Admin  │ Active │ Edit/Remove│   │
│  │ Bob M.  │ bob@...       │ Member │ Pending│ Edit/Remove│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useOrganizationMembers.ts` | Create | Hook for fetching and managing members |
| `src/pages/Organization.tsx` | Create | Main organization management page |
| `src/App.tsx` | Modify | Add `/organization` route |

---

### Implementation Details

#### 1. Create useOrganizationMembers Hook

**Location:** `src/hooks/useOrganizationMembers.ts`

**Purpose:** Encapsulate all member management logic

**Returns:**
- `members: OrganizationMember[]` - List of all organization members
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `inviteMember: (email: string, displayName: string) => Promise<void>` - Invite new member
- `updateMember: (memberId: string, updates: { displayName?: string; role?: MemberRole }) => Promise<void>` - Edit member
- `removeMember: (memberId: string) => Promise<void>` - Remove member from organization
- `refetch: () => Promise<void>` - Refresh member list

**Implementation approach:**
- Uses `useAuth()` to get current organization
- Fetches members from `organization_members` table filtered by `organization_id`
- Handles all CRUD operations with proper error handling
- Shows toast notifications for success/failure

---

#### 2. Create Organization Page

**Location:** `src/pages/Organization.tsx`

**Structure:**

**A. Owner-Only Protection**
- Check if `memberRole === 'owner'`
- If not owner, show message: "Only organization owners can manage team members"
- Styled as a centered card with info icon

**B. Organization Header Section**
- Card containing:
  - Organization name as large heading with Edit button (pencil icon)
  - Member count display: "X / 10 members" 
  - Progress bar showing capacity usage
  - Edit dialog for renaming organization (updates `organizations` table)

**C. Team Members Section**
- Header row with "Team Members" title and "Invite Member" button (green, right-aligned)
- Table component with columns:
  - **Name** - `display_name` or fallback to email prefix
  - **Email** - Member's email address
  - **Role** - Badge with role name (Owner=green, Admin=blue, Member=gray)
  - **Status** - Badge with status (Active=green, Pending=yellow, Disabled=red)
  - **Actions** - Edit/Remove buttons or "You" text for owner

**D. Empty State**
- When only the owner exists, show encouraging message
- "No team members yet. Invite your first team member!"

**E. Dialogs:**

1. **Invite Member Dialog**
   - Trigger: "Invite Member" button
   - Fields:
     - Email input (required, email validation with Zod)
     - Display Name input (required, min 2 characters)
   - Buttons: "Cancel" (outline), "Send Invitation" (green primary)
   - On submit:
     - Insert into `organization_members` with:
       - `organization_id` from context
       - `user_id` = generated UUID (placeholder until they sign up)
       - `role` = 'member' (default)
       - `status` = 'pending'
       - `email` = input value
       - `display_name` = input value
       - `invited_at` = current timestamp
     - Show success toast
     - Close dialog and refetch members

2. **Edit Member Dialog**
   - Trigger: "Edit" button in row actions
   - Fields:
     - Display Name (editable input)
     - Role dropdown (Admin/Member options only - cannot change to Owner)
   - Buttons: "Cancel", "Save Changes"
   - On submit:
     - Update `organization_members` record
     - Show success toast
     - Close dialog and refetch members

3. **Remove Member Alert Dialog**
   - Trigger: "Remove" button in row actions
   - Title: "Remove Team Member"
   - Description: "Are you sure you want to remove [name] from the organization? This action cannot be undone."
   - Buttons: "Cancel" (outline), "Remove" (destructive/red)
   - On confirm:
     - Delete from `organization_members`
     - Show success toast
     - Close dialog and refetch members

4. **Edit Organization Dialog**
   - Trigger: "Edit" button next to org name
   - Fields:
     - Organization Name input
   - Buttons: "Cancel", "Save"
   - On submit:
     - Update `organizations` table
     - Call `refreshOrganization()` from context
     - Show success toast

---

#### 3. Update App.tsx

Add new route for organization page:

```typescript
<Route
  path="/organization"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Organization">
          <Organization />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

The sidebar already has the Organization link pointing to `/organization` - no changes needed there.

---

### Badge Color Scheme

Following the Monday.com-inspired theme:

| Badge | Color | Tailwind Classes |
|-------|-------|------------------|
| Owner | Green | `bg-[#01cb72] text-white` |
| Admin | Blue | `bg-blue-500 text-white` |
| Member | Gray | `bg-gray-200 text-gray-700` |
| Active | Green | `bg-green-100 text-green-700` |
| Pending | Yellow | `bg-[#ffcd03] text-gray-900` |
| Disabled | Red | `bg-[#fb275d] text-white` |

---

### Validation

Using Zod for form validation:

```typescript
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

const editMemberSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  role: z.enum(["admin", "member"]),
});

const editOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
});
```

---

### Responsive Design

- **Desktop:** Full table with all columns visible
- **Mobile:** 
  - Cards stack vertically
  - Table has horizontal scroll
  - Action buttons collapse into dropdown menu on smaller screens

---

### Error Handling

- Network errors show toast with retry suggestion
- Validation errors show inline below form fields
- Loading states for all async operations
- Disabled buttons during submission to prevent double-submits

---

### Security Considerations

The existing RLS policies handle security:
- `Org owner manages members` - Allows owners full CRUD on their org members
- `Users view own membership` - Members can only view their own membership
- `Owners full access to own org` - Owners can update organization details

No additional database changes needed.

---

### User Experience Flow

1. Owner navigates to /organization from sidebar
2. Sees organization header with name and member count
3. Views table of all members with their roles and statuses
4. Can click "Invite Member" to add new team members
5. Can click "Edit" on any non-owner member to update details
6. Can click "Remove" to remove members (with confirmation)
7. Can click edit icon next to org name to rename organization

