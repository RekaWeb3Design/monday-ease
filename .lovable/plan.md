

## Add Error Handling to AuthContext setTimeout

### Overview
Add try-catch-finally to the setTimeout callback in AuthContext to ensure `setLoading(false)` is always called even if `fetchProfile` or `fetchOrganization` fails. This prevents the app from getting stuck in a loading state if an error occurs during user data fetching.

---

### File to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Wrap setTimeout callback in try-catch-finally |

---

### Implementation

**Current code (lines 146-154):**
```typescript
setTimeout(async () => {
  const userProfile = await fetchProfile(newSession.user.id);
  setProfile(userProfile);
  await fetchOrganization(newSession.user.id);
  // Only set loading false AFTER org is fetched to prevent flash
  if (event === "INITIAL_SESSION") {
    setLoading(false);
  }
}, 0);
```

**Updated code:**
```typescript
setTimeout(async () => {
  try {
    const userProfile = await fetchProfile(newSession.user.id);
    setProfile(userProfile);
    await fetchOrganization(newSession.user.id);
  } catch (error) {
    console.error('Error loading user data:', error);
  } finally {
    if (event === "INITIAL_SESSION") {
      setLoading(false);
    }
  }
}, 0);
```

---

### Why This Matters

- **Prevents stuck loading state**: If either `fetchProfile` or `fetchOrganization` throws an error, the `finally` block ensures `setLoading(false)` is still called
- **Error visibility**: Errors are logged to console for debugging
- **Resilience**: The app continues to function even if data fetching fails partially

