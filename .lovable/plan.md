

# Fix Monday.com OAuth Scope Name

## Overview

Update the OAuth scope parameter to use the correct Monday.com API scope name.

---

## Change

| File | Line | Change |
|------|------|--------|
| `src/hooks/useMondayOAuth.ts` | 30 | Replace `me:read` with `users:read` |

---

## Before

```typescript
scopes: 'me:read boards:read boards:write',
```

## After

```typescript
scopes: 'users:read boards:read boards:write',
```

---

## Reason

The Monday.com OAuth API does not recognize `me:read` as a valid scope. The correct scope for reading user information is `users:read`.

