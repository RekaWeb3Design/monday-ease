

## Fix: Organization Creation Screen Flash on Login

### The Problem
When a user who already has an organization logs in, they briefly see the organization creation screen (Onboarding page) before being redirected to the dashboard. This creates a jarring UX experience.

### Root Cause
The issue is a race condition in the `AuthContext.tsx`. The `loading` state is set to `false` before the organization data has finished loading:

1. The `onAuthStateChange` listener calls `setLoading(false)` on the `INITIAL_SESSION` event (line 159)
2. But the `fetchOrganization` call is deferred inside a `setTimeout` (lines 146-150)
3. This means `RequireOrganization` sees `loading: false` but `organization: null`
4. It redirects to `/onboarding`, then the org loads, and the user is redirected back

### Solution
Track when organization data is actually loaded, not just when the auth session is established. We'll add an `initialLoadComplete` flag that only becomes `true` after the organization fetch finishes.

---

### File to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Separate auth loading from org loading |

---

### Implementation

**1. Update AuthContext.tsx**

Add a new `orgLoading` state to track whether organization data is still being fetched:

```typescript
const [loading, setLoading] = useState(true);
const [orgLoading, setOrgLoading] = useState(true);  // NEW
```

**2. Wrap fetchOrganization calls**

Set `orgLoading` to `true` before fetching and `false` after:

```typescript
// In the setTimeout callback
setTimeout(async () => {
  const userProfile = await fetchProfile(newSession.user.id);
  setProfile(userProfile);
  await fetchOrganization(newSession.user.id);
  setOrgLoading(false);  // NEW
}, 0);

// In getSession().then()
if (existingSession?.user) {
  const userProfile = await fetchProfile(existingSession.user.id);
  setProfile(userProfile);
  await fetchOrganization(existingSession.user.id);
}
setOrgLoading(false);  // NEW
setLoading(false);
```

**3. Handle the no-session case**

When there's no session, also set `orgLoading` to `false`:

```typescript
} else {
  setProfile(null);
  setOrganization(null);
  setMemberRole(null);
  setOrgLoading(false);  // NEW
}
```

**4. Derive combined loading state**

Either expose `orgLoading` separately or combine them. The simplest fix is to keep one `loading` state but only set it to `false` after the org fetch completes:

**Simplified approach** - just move `setLoading(false)` to after `fetchOrganization`:

```typescript
// In onAuthStateChange INITIAL_SESSION handler:
// Remove the immediate setLoading(false) on line 158-160
// Instead, let the setTimeout callback handle it

setTimeout(async () => {
  const userProfile = await fetchProfile(newSession.user.id);
  setProfile(userProfile);
  await fetchOrganization(newSession.user.id);
  setLoading(false);  // Only set loading false AFTER org is fetched
}, 0);
```

And for the no-user case:
```typescript
} else {
  setProfile(null);
  setOrganization(null);
  setMemberRole(null);
  setLoading(false);  // Set loading false when there's no user
}
```

---

### Key Changes Summary

1. Remove `setLoading(false)` from the `INITIAL_SESSION` event check (line 157-160)
2. Move `setLoading(false)` inside the `setTimeout` callback, after `fetchOrganization` completes
3. Add `setLoading(false)` to the `else` branch when there's no session/user
4. Ensure `getSession().then()` only sets `loading` to `false` after `fetchOrganization` completes

---

### Why This Works

- The `loading` state now represents "are we done loading ALL user data?" rather than just "do we have a session?"
- `RequireOrganization` will continue showing the loading spinner until both the session AND organization data are loaded
- No flash of the onboarding screen because we don't render it until we know the user truly has no organization

