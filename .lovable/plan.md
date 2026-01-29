

## Fix Monday OAuth Scope Parameter Name

### Overview
Update the Monday.com OAuth parameter name from `scopes` (plural) to `scope` (singular), as required by the Monday.com OAuth API specification.

---

### File to Modify

| File | Change |
|------|--------|
| `src/hooks/useMondayOAuth.ts` | Rename `scopes` to `scope` on line 30 |

---

### Implementation

**Current code (line 30):**
```typescript
scopes: 'boards:read,boards:write',
```

**Updated code:**
```typescript
scope: 'boards:read,boards:write',
```

---

### Why This Matters
Monday.com's OAuth API expects the parameter to be named `scope` (singular). Using `scopes` (plural) will cause the authorization request to fail or not request the proper permissions.

