

# Invite Flow and Member Experience Polish

## Overview

This plan implements four improvements to personalize the invite flow and member experience by showing the organization name throughout the journey.

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/invite-member/index.ts` | UPDATE | Fetch org name, include in email subject and body |
| `src/pages/Auth.tsx` | UPDATE | Fetch & display org name on password setup page |
| `src/pages/MemberDashboard.tsx` | UPDATE | Already uses first name correctly - minor cleanup |
| `src/components/layout/AppSidebar.tsx` | UPDATE | Display organization name in sidebar footer |

---

## 1. Show Organization Name in Invite Email

### File: `supabase/functions/invite-member/index.ts`

**Add organization name fetch after owner verification (after line 32):**

```typescript
// Fetch organization name for personalized email
const { data: orgData } = await adminClient
  .from("organizations")
  .select("name")
  .eq("id", organizationId)
  .single();

const orgName = orgData?.name || "a team";
```

**Update email subject (line 151):**

Change:
```typescript
subject: "You're invited to join MondayEase",
```

To:
```typescript
subject: `You're invited to join ${orgName} on MondayEase`,
```

**Update email body (lines 173-177):**

Change:
```html
<h1 style="...">You're Invited!</h1>
<p style="...">
  Hi ${displayName.trim()},<br><br>
  You've been invited to join a team on MondayEase. Click the button below...
</p>
```

To:
```html
<h1 style="...">You're Invited!</h1>
<p style="...">
  Hi ${displayName.trim().split(' ')[0]},<br><br>
  You've been invited to join <strong>${orgName}</strong> on MondayEase. Click the button below...
</p>
```

---

## 2. Show Organization Name on Password Setup Page

### File: `src/pages/Auth.tsx`

**Add state for invited org name (after line 77):**

```typescript
const [invitedOrgName, setInvitedOrgName] = useState<string | null>(null);
```

**Add effect to fetch org name when on password setup (after line 88):**

```typescript
// Fetch organization name for invited users on password setup
useEffect(() => {
  async function fetchInvitedOrgName() {
    if (!showPasswordSetup || !user?.user_metadata?.invited_to_organization) {
      return;
    }
    
    try {
      const { data } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", user.user_metadata.invited_to_organization)
        .single();
      
      if (data) {
        setInvitedOrgName(data.name);
      }
    } catch (err) {
      console.error("Error fetching invited org:", err);
    }
  }
  
  fetchInvitedOrgName();
}, [showPasswordSetup, user]);
```

**Update password setup UI (around lines 326-330):**

Change:
```tsx
<CardHeader className="text-center pb-2">
  <h2 className="text-xl font-semibold">Set Your Password</h2>
  <p className="text-sm text-muted-foreground">
    Create a password to complete your account setup
  </p>
</CardHeader>
```

To:
```tsx
<CardHeader className="text-center pb-2">
  <h2 className="text-xl font-semibold">Set Your Password</h2>
  {invitedOrgName && (
    <p className="text-sm text-primary font-medium mt-1">
      You're joining {invitedOrgName}
    </p>
  )}
  <p className="text-sm text-muted-foreground">
    Create a password to complete your account setup
  </p>
</CardHeader>
```

---

## 3. Member Dashboard First Name Greeting

### File: `src/pages/MemberDashboard.tsx`

**Current implementation (line 12) already extracts first name:**
```typescript
const displayName = profile?.full_name?.split(" ")[0] || "there";
```

This is already correct. No changes needed.

---

## 4. Show Organization Name in Member Sidebar

### File: `src/components/layout/AppSidebar.tsx`

**Add organization from auth context (line 66):**

The sidebar already has access to `useAuth()` - just need to destructure organization:

Change:
```typescript
const { profile, memberRole } = useAuth();
```

To:
```typescript
const { profile, memberRole, organization } = useAuth();
```

**Update sidebar footer user section (lines 228-243):**

Add organization name display below the user's email:

```tsx
{/* User section */}
<div className="flex items-center gap-3 p-3">
  <Avatar className="h-8 w-8 shrink-0">
    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
      {avatarInitial}
    </AvatarFallback>
  </Avatar>
  {!isCollapsed && (
    <div className="flex flex-col overflow-hidden">
      <span className="truncate text-sm font-medium text-sidebar-foreground">
        {displayName}
      </span>
      {organization && (
        <span className="truncate text-xs text-primary/80">
          {organization.name}
        </span>
      )}
      <span className="truncate text-xs text-sidebar-foreground/70">
        {profile?.email || "user@example.com"}
      </span>
    </div>
  )}
</div>
```

---

## Complete Flow After Changes

```text
1. Owner invites "John Smith" to "Acme Corp"
   ↓
2. Email arrives: 
   - Subject: "You're invited to join Acme Corp on MondayEase"
   - Body: "Hi John, You've been invited to join Acme Corp on MondayEase..."
   ↓
3. John clicks "Set Up Your Account" → /auth
   ↓
4. Password setup page shows:
   - "Set Your Password"
   - "You're joining Acme Corp" (green highlight)
   - Password form
   ↓
5. John sets password → redirected to /member
   ↓
6. Member Dashboard shows:
   - "Welcome back, John!" (first name only)
   - Sidebar footer: "John Smith" + "Acme Corp" + email
```

---

## Visual Changes

### Invite Email
- Subject personalized with org name
- Body greeting uses first name only
- Organization name in bold

### Password Setup Page
- New line showing "You're joining [Org Name]" in primary color
- Provides reassurance they're joining the right team

### Sidebar Footer
- Organization name displayed between user name and email
- Uses primary color accent for visibility

---

## Files Summary

| File | Lines Changed | Description |
|------|---------------|-------------|
| `supabase/functions/invite-member/index.ts` | ~10 lines | Fetch org, personalize subject and body |
| `src/pages/Auth.tsx` | ~25 lines | Add state, effect, and UI for org name |
| `src/components/layout/AppSidebar.tsx` | ~8 lines | Add org to destructure, display in footer |

