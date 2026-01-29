

## Fix Monday OAuth Scope Format

### Overview
Update the Monday.com OAuth scope format from comma-separated to space-separated, and add the `me:read` scope for basic user info access.

---

### File to Modify

| File | Change |
|------|--------|
| `src/hooks/useMondayOAuth.ts` | Update scope format on line 30 |

---

### Implementation

**Current code (line 30):**
```typescript
scope: 'boards:read,boards:write',
```

**Updated code:**
```typescript
scope: 'me:read boards:read boards:write',
```

---

### Changes Made
1. Changed from comma-separated to space-separated format (Monday.com API requirement)
2. Added `me:read` scope for basic user information access

