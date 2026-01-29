

## Real Supabase Authentication Implementation

### Overview
Replace the mock authentication with real Supabase auth, add session persistence, protected routes, and profile fetching from the existing `user_profiles` table.

---

### Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        App.tsx                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AuthProvider                           │   │
│  │  - Supabase session listener                             │   │
│  │  - User profile from user_profiles table                 │   │
│  │  - Loading state for initial auth check                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┴────────────────────┐              │
│         ▼                                         ▼              │
│  ┌─────────────┐                         ┌──────────────────┐   │
│  │   /auth     │                         │ ProtectedRoute   │   │
│  │ (redirects  │                         │ (wraps /, etc.)  │   │
│  │ if logged   │                         │                  │   │
│  │ in)         │                         │ Shows loading    │   │
│  └─────────────┘                         │ or redirects to  │   │
│                                          │ /auth if no user │   │
│                                          └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1. Update Types (src/types/index.ts)

**Changes:**
- Add `UserProfile` interface matching `user_profiles` table schema
- Update `AuthContextType` to include:
  - `session` (Supabase Session object)
  - `profile` (UserProfile from database)
  - Updated `signUp` signature to accept `fullName` parameter

**New UserProfile type:**
```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string | null;
  avatar_url: string | null;
  primary_organization_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

---

### 2. Rewrite AuthContext.tsx

**Key implementation details:**

1. **State management:**
   - `session`: Supabase Session | null
   - `user`: Supabase User | null (from auth)
   - `profile`: UserProfile | null (from database)
   - `loading`: boolean (true during initial auth check)

2. **Auth state listener setup:**
   - Set up `onAuthStateChange` listener FIRST
   - Then call `getSession()` to check existing session
   - This prevents missing auth events during initialization

3. **Profile fetching:**
   - After auth state changes, fetch profile from `user_profiles` table using `setTimeout(0)` to prevent deadlock
   - Query: `supabase.from('user_profiles').select('*').eq('id', user.id).single()`

4. **Sign In:**
   ```typescript
   const { error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) throw error;
   ```

5. **Sign Up:**
   ```typescript
   const { error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       emailRedirectTo: `${window.location.origin}/`,
       data: { full_name: fullName }
     }
   });
   if (error) throw error;
   ```

6. **Sign Out:**
   ```typescript
   await supabase.auth.signOut();
   ```

---

### 3. Create ProtectedRoute Component

**Location:** `src/components/auth/ProtectedRoute.tsx`

**Behavior:**
- If `loading` is true: show a centered spinner
- If no `user` after loading completes: redirect to `/auth`
- Otherwise: render children

**Implementation:**
```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

---

### 4. Update App.tsx Routing

**Changes:**
- Wrap Dashboard route (and future protected routes) with `ProtectedRoute`
- Keep `/auth` route as-is (Auth page handles its own redirect logic)

```typescript
<Route
  path="/"
  element={
    <ProtectedRoute>
      <AppLayout pageTitle="Dashboard">
        <Dashboard />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

---

### 5. Update Auth.tsx Page

**New features:**

1. **Add fullName field to signup form:**
   - New state: `signUpFullName`
   - New input field between Email and Password
   - Pass to `signUp(email, password, fullName)`

2. **Redirect authenticated users:**
   - Check if `user` exists from `useAuth()`
   - If logged in, redirect to `/` with `useEffect`

3. **Show real Supabase error messages:**
   - Catch errors and display `error.message`
   - Handle specific cases like "User already registered"

4. **Post-signup confirmation message:**
   - After successful signup, show: "Check your email to confirm your account"
   - Use state to track `signUpSuccess: boolean`

---

### 6. Update Dashboard.tsx

**Changes:**
- Import `profile` from `useAuth()` instead of `user`
- Display `profile?.full_name` in welcome message
- Fallback to email prefix if no name set

```typescript
const { profile } = useAuth();
// ...
<p>Welcome back, {profile?.full_name || profile?.email?.split('@')[0] || 'User'}!</p>
```

---

### 7. Update AppSidebar.tsx

**Changes:**
- Get `profile` from `useAuth()` 
- Display `profile?.full_name` for user name
- Display `profile?.email` for email
- Use first letter of full_name for avatar fallback

---

### 8. Update TopNavbar.tsx

**Changes:**
- Get `profile` from `useAuth()`
- Display `profile?.full_name` and `profile?.email` in dropdown
- Use first letter of full_name for avatar

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/types/index.ts` | Add UserProfile type, update AuthContextType |
| `src/contexts/AuthContext.tsx` | Complete rewrite with Supabase auth |
| `src/components/auth/ProtectedRoute.tsx` | **New file** |
| `src/App.tsx` | Wrap routes with ProtectedRoute |
| `src/pages/Auth.tsx` | Add fullName field, real errors, redirect logic |
| `src/pages/Dashboard.tsx` | Use profile instead of user |
| `src/components/layout/AppSidebar.tsx` | Use profile instead of user |
| `src/components/layout/TopNavbar.tsx` | Use profile instead of user |

---

### Important Notes

1. **Email Confirmation**: By default, Supabase requires email confirmation. After signup, users must click the link in their email before they can log in. You can disable this in Supabase Dashboard > Authentication > Providers > Email > "Confirm email" toggle.

2. **Redirect URLs**: The app will use `window.location.origin` for email redirect, which works for both preview and production URLs.

3. **Profile Creation**: The `user_profiles` table has a trigger (`handle_new_user`) that automatically creates a profile when a user signs up, using the `full_name` from auth metadata.

4. **Session Persistence**: Supabase client is already configured with `persistSession: true` and `localStorage` storage, so sessions will persist across page refreshes.

