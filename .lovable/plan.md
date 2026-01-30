

## Add Member Self-Registration Flow

### Overview
Extend the Auth page to allow users to choose between creating their own organization (Owner) or requesting to join an existing one (Member with pending status).

---

### Architecture

```text
                      Auth Page (/auth)
                           │
                    ┌──────┴──────┐
                    │  Sign Up    │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                                 │
    "Create my org"                   "Join existing"
     (Owner flow)                    (Member flow)
          │                                 │
          ▼                                 ▼
    Onboarding page              Organization selector
    (create org)                         │
          │                              ▼
          │                    Insert pending member
          │                              │
          │                              ▼
          │                    Pending Approval page
          │                              │
          ▼                              ▼
       Dashboard                   Wait for owner
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/PendingApproval.tsx` | Simple page for pending members |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add registration type toggle and org selector |
| `src/App.tsx` | Add route for `/pending-approval` |
| `src/contexts/AuthContext.tsx` | Handle pending member redirection |

### Database Changes

| Type | Description |
|------|-------------|
| RLS Policy | Add policy for users to insert their own membership request |

---

### Implementation Details

#### 1. Database: RLS Policy for Self-Registration

Add a new RLS policy to allow authenticated users to insert their own pending membership:

```sql
CREATE POLICY "Users can request to join orgs"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'member' 
  AND status = 'pending'
);
```

This ensures users can only:
- Insert records for themselves (user_id = auth.uid())
- Request as a 'member' role (not admin or owner)
- Start with 'pending' status

#### 2. Auth Page Updates (`src/pages/Auth.tsx`)

Add new state for registration type:

```typescript
// New state
const [registrationType, setRegistrationType] = useState<'owner' | 'member'>('owner');
const [selectedOrgId, setSelectedOrgId] = useState<string>("");
const [organizations, setOrganizations] = useState<{id: string; name: string}[]>([]);
const [orgsLoading, setOrgsLoading] = useState(false);
```

Add organization fetching when member type is selected:

```typescript
// Fetch organizations when registrationType changes to 'member'
useEffect(() => {
  if (registrationType === 'member') {
    setOrgsLoading(true);
    supabase
      .from('organizations')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setOrganizations(data || []);
        setOrgsLoading(false);
      });
  }
}, [registrationType]);
```

Add UI components after confirm password field (only on signup tab):

```tsx
{/* Registration Type Selector */}
<div className="space-y-3 border-t pt-4">
  <Label>Account Type</Label>
  <RadioGroup
    value={registrationType}
    onValueChange={(val) => setRegistrationType(val as 'owner' | 'member')}
    className="space-y-2"
  >
    <div className="flex items-center space-x-3">
      <RadioGroupItem value="owner" id="owner" />
      <Label htmlFor="owner" className="font-normal cursor-pointer">
        Create my organization
      </Label>
    </div>
    <div className="flex items-center space-x-3">
      <RadioGroupItem value="member" id="member" />
      <Label htmlFor="member" className="font-normal cursor-pointer">
        Join existing organization
      </Label>
    </div>
  </RadioGroup>
</div>

{/* Organization Selector (only when member selected) */}
{registrationType === 'member' && (
  <div className="space-y-2">
    <Label htmlFor="org-select">Select Organization</Label>
    <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
      <SelectTrigger id="org-select">
        <SelectValue placeholder="Select organization to join..." />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

Modify handleSignUp to handle member registration:

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  // ... existing validation ...
  
  // Additional validation for member type
  if (registrationType === 'member' && !selectedOrgId) {
    setSignUpError("Please select an organization to join");
    return;
  }

  setSignUpLoading(true);
  try {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: signUpFullName,
          registration_type: registrationType,
          requested_org_id: registrationType === 'member' ? selectedOrgId : null,
        },
      },
    });

    if (error) throw error;
    
    // For member registration, we'll create the pending membership after email confirmation
    // Store the intent in user metadata so we can process it on first login
    
    setSignUpSuccess(true);
    // ... clear form ...
  } catch (error: any) {
    setSignUpError(error.message || "Failed to sign up");
  } finally {
    setSignUpLoading(false);
  }
};
```

#### 3. AuthContext Updates (`src/contexts/AuthContext.tsx`)

Handle pending membership creation on first login for member registration:

```typescript
// In the auth state change handler, after fetching profile:
if (newSession?.user) {
  setTimeout(async () => {
    const userProfile = await fetchProfile(newSession.user.id);
    setProfile(userProfile);
    
    // Check if this is a new member registration
    const metadata = newSession.user.user_metadata;
    if (metadata?.registration_type === 'member' && metadata?.requested_org_id) {
      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', newSession.user.id)
        .eq('organization_id', metadata.requested_org_id)
        .maybeSingle();
      
      if (!existingMembership) {
        // Create pending membership
        await supabase.from('organization_members').insert({
          organization_id: metadata.requested_org_id,
          user_id: newSession.user.id,
          email: newSession.user.email!,
          display_name: metadata.full_name || null,
          role: 'member',
          status: 'pending',
        });
      }
    }
    
    await fetchOrganization(newSession.user.id);
    // ... rest of logic ...
  }, 0);
}
```

Update fetchOrganization to detect pending status:

```typescript
const fetchOrganization = useCallback(async (userId: string) => {
  // ... existing owner check ...
  
  // Check for active membership
  const { data: activeMembership } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (activeMembership && activeMembership.organizations) {
    setOrganization(activeMembership.organizations as unknown as Organization);
    setMemberRole(activeMembership.role as MemberRole);
    return;
  }

  // Check for pending membership
  const { data: pendingMembership } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingMembership) {
    // Set a special state to indicate pending
    setPendingOrganization(pendingMembership.organizations as unknown as Organization);
    setOrganization(null);
    setMemberRole(null);
    return;
  }
  
  // No org at all
  setOrganization(null);
  setMemberRole(null);
}, []);
```

Add new state and context value:

```typescript
const [pendingOrganization, setPendingOrganization] = useState<Organization | null>(null);

// Add to context value:
pendingOrganization,
```

Update types in `src/types/index.ts`:

```typescript
export interface AuthContextType {
  // ... existing ...
  pendingOrganization: Organization | null;
}
```

#### 4. PendingApproval Page (`src/pages/PendingApproval.tsx`)

Create a simple page for pending members:

```typescript
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import mondayeaseLogo from "@/assets/mondayease_logo.png";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { pendingOrganization, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <img src={mondayeaseLogo} alt="MondayEase" className="h-auto w-[180px]" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffcd03]/20">
              <Clock className="h-6 w-6 text-[#ffcd03]" />
            </div>
            <CardTitle className="text-xl">Pending Approval</CardTitle>
            <CardDescription>
              Your request to join{" "}
              <span className="font-medium text-foreground">
                {pendingOrganization?.name || "the organization"}
              </span>{" "}
              is pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The organization owner will review your request. You'll gain access once approved.
            </p>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

#### 5. App.tsx Route Updates

Add the pending approval route:

```typescript
import PendingApproval from "./pages/PendingApproval";

// Add route after /onboarding:
<Route
  path="/pending-approval"
  element={
    <ProtectedRoute>
      <PendingApproval />
    </ProtectedRoute>
  }
/>
```

#### 6. RequireOrganization Update

Update to redirect pending members:

```typescript
export function RequireOrganization({ children }: RequireOrganizationProps) {
  const { organization, pendingOrganization, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect pending members to pending approval page
  if (pendingOrganization && !organization) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Redirect users without org to onboarding
  if (!organization) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
```

---

### New Imports for Auth.tsx

```typescript
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

---

### Flow Summary

1. **User visits /auth and selects Sign Up tab**
2. **Fills in name, email, password, confirm password**
3. **Chooses account type:**
   - Owner (default): Shows email confirmation, then goes to /onboarding
   - Member: Shows organization dropdown
4. **If Member, selects organization from dropdown**
5. **Submits form - user metadata stores registration intent**
6. **User confirms email and logs in**
7. **AuthContext detects member registration metadata:**
   - Creates pending membership in organization_members
   - Sets pendingOrganization state
8. **RequireOrganization redirects to /pending-approval**
9. **User sees pending message with org name and logout button**
10. **Owner approves via Organization page (existing functionality)**
11. **Member logs in again and is now redirected to /member dashboard**

---

### Edge Cases Handled

- No organizations exist: Dropdown shows empty, user must create org instead
- User refreshes on pending page: State restored from database
- Pending member tries to access dashboard: Redirected to pending page
- User with metadata logs in multiple times: Only creates membership once

