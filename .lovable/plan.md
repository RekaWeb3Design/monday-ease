

# Fix: Edge Function Import Error Breaking CORS

## Root Cause

The edge function logs reveal the actual error:

```
worker boot error: Uncaught SyntaxError: The requested module 
'https://deno.land/std@0.224.0/encoding/base64.ts' does not provide an export named 'decode'
```

The `get-member-tasks` function imports `_shared/monday.ts`, which uses:
```typescript
import { decode as decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

This import is broken because the Deno standard library reorganized its encoding modules. The function fails to boot entirely, so it can't respond to OPTIONS preflight requests - this causes the CORS error.

---

## Solution

Update `supabase/functions/_shared/monday.ts` to use the correct Deno standard library import. In newer versions of the Deno standard library, base64 encoding is available from `@std/encoding`:

**Option A - Use npm specifier (recommended for stability):**
```typescript
// Use built-in atob/btoa or a stable approach
```

**Option B - Use correct Deno std path:**
```typescript
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
// Note: The function is named decodeBase64, not decode
```

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/_shared/monday.ts` | UPDATE | Fix base64 import to use correct export name |

---

## Technical Details

### Current (Broken)
```typescript
import { decode as decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

### Fixed Version
```typescript
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

The Deno standard library exports the function as `decodeBase64` (not `decode`). The current code tries to import `decode` and rename it to `decodeBase64`, but `decode` doesn't exist.

Alternatively, we can use the Web API's `atob()` function which is built into Deno and more stable:

```typescript
// No import needed - use built-in Web APIs
function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
```

---

## Implementation

### Update `monday.ts` - Line 2

Change:
```typescript
import { decode as decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

To:
```typescript
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
```

### Update `decryptToken` function

The function already uses `decodeBase64(encryptedData)` which will work correctly with the renamed import since we're now importing the function with its actual name.

---

## Affected Edge Functions

All edge functions using `_shared/monday.ts` are affected:
- `get-member-tasks`
- `get-board-view-data`
- `get-monday-users`
- `execute-workflow`

Fixing `monday.ts` will fix all of them simultaneously.

---

## After Fix

1. Deploy the updated `_shared/monday.ts`
2. All edge functions will boot correctly
3. CORS preflight requests will be handled properly
4. Member dashboard will load tasks successfully

---

## Files Changed

| File | Lines Changed | Description |
|------|---------------|-------------|
| `supabase/functions/_shared/monday.ts` | 1 line | Fix base64 import to use correct export name `decodeBase64` |

