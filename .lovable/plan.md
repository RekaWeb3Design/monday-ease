

## Fix Monday OAuth Scope Parameter Format

### Overview
Update the Monday.com OAuth scopes parameter from space-separated to comma-separated format, as required by the Monday.com API.

---

### File to Modify

| File | Change |
|------|--------|
| `src/hooks/useMondayOAuth.ts` | Fix scopes format on line 30 |

---

### Implementation

**Current code (line 30):**
```typescript
scopes: 'boards:read boards:write',
```

**Updated code:**
```typescript
scopes: 'boards:read,boards:write',
```

---

### Why This Matters
Monday.com's OAuth API requires scopes to be comma-separated without spaces. The current space-separated format may cause authorization failures or incorrect scope parsing.

