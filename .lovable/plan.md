
# Fix Client Management Issues

## Overview

This plan addresses three issues in the Client Management feature:
1. Add password viewing capability to the Security tab in EditClientDialog
2. Fix the board list in AddClientDialog Step 2 (showing no boards even when boards exist)
3. Ensure the regenerate password functionality works correctly

---

## Issue 1: Add Password Viewing to Security Tab

### Current Behavior
The Security tab only shows a "Regenerate Password" button with no way to view the current password.

### Solution
Add a "View Password" section that calls the `get-client-password` edge function to fetch and display the password.

### Changes to EditClientDialog.tsx

1. Add new state variables:
   - `currentPassword` - stores the fetched password
   - `isLoadingPassword` - loading state for the fetch
   - `showPassword` - toggle for show/hide

2. Add new function:
```typescript
const handleViewPassword = async () => {
  try {
    setIsLoadingPassword(true);
    const { data, error } = await supabase.functions.invoke('get-client-password', {
      body: { clientId: client.id }
    });
    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to fetch password');
    }
    setCurrentPassword(data.password);
    setShowPassword(true);
  } catch (error) {
    toast.error('Failed to fetch password');
  } finally {
    setIsLoadingPassword(false);
  }
};
```

3. Update Security tab UI:
   - Add "Dashboard URL" section with copy button (already exists)
   - Add "Current Password" section with:
     - "Show Password" button that fetches the password
     - When loaded: readonly input with the password + copy button
     - Hide button to clear the password from view
   - Keep existing "Regenerate Password" section below

### New Security Tab Layout

```text
+------------------------------------------+
| Dashboard URL                            |
| [https://...com/c/slug    ] [Copy]       |
+------------------------------------------+
| Current Password                         |
| [Show Password] or [password***] [Copy]  |
+------------------------------------------+
| Regenerate Password                      |
| This will invalidate the current...      |
| [Regenerate Password]                    |
+------------------------------------------+
```

---

## Issue 2: Fix AddClientDialog Board Access (No Boards Showing)

### Root Cause
The `boards` state is initialized when the dialog opens via `initializeBoards()`, but `boardConfigs` from `useBoardConfigs()` may not be loaded yet at that moment. The initialization runs once when `open` becomes `true`, but if `boardConfigs` is still loading or empty at that point, `boards` will be empty.

### Solution
Add a `useEffect` that watches `boardConfigs` changes and re-initializes boards when configs are loaded.

### Changes to AddClientDialog.tsx

1. Replace the current `initializeBoards` call pattern with a `useEffect`:

```typescript
// Re-initialize boards when boardConfigs changes (when data loads)
useEffect(() => {
  if (open && boardConfigs.length > 0 && boards.length === 0) {
    setBoards(
      boardConfigs.map((config) => ({
        id: config.id,
        name: config.board_name,
        selected: false,
        filterValue: "",
      }))
    );
  }
}, [open, boardConfigs]);
```

2. Also update `handleOpenChange` to properly reset and initialize:

```typescript
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    // Reset all state when closing
    setStep(1);
    setFormData({ ... });
    setBoards([]);
    setResult(null);
    setPasswordCopied(false);
    setUrlCopied(false);
  }
  onOpenChange(newOpen);
};
```

This ensures that when the dialog opens and board configs are loaded (even if they load after the dialog opens), the boards will be populated.

---

## Issue 3: Verify Regenerate Password Works

### Current Code Analysis
Looking at `useClients.ts`, the `regeneratePasswordMutation` is already correctly implemented:

```typescript
const regeneratePasswordMutation = useMutation({
  mutationFn: async (clientId: string): Promise<{ password: string }> => {
    const { data, error } = await supabase.functions.invoke("create-client", {
      body: {
        regeneratePassword: true,
        clientId,
      },
    });
    // ...
  },
});
```

This matches the required API format. If there's a 400 error, it's likely from the edge function, not the frontend code. The frontend implementation is correct.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/clients/EditClientDialog.tsx` | Add password viewing functionality, update Security tab UI |
| `src/components/clients/AddClientDialog.tsx` | Fix board initialization with useEffect |
| `src/hooks/useClients.ts` | Add `getClientPassword` function |

---

## Technical Implementation Details

### EditClientDialog.tsx Changes

1. **New imports**: Add `Eye`, `EyeOff` icons from lucide-react

2. **New state**:
```typescript
const [currentPassword, setCurrentPassword] = useState<string | null>(null);
const [isLoadingPassword, setIsLoadingPassword] = useState(false);
const [showPassword, setShowPassword] = useState(false);
```

3. **Add getClientPassword from hook**:
```typescript
const { ..., getClientPassword, isGettingPassword } = useClients();
```

4. **New handler function**:
```typescript
const handleViewPassword = async () => {
  try {
    const result = await getClientPassword(client.id);
    setCurrentPassword(result.password);
    setShowPassword(true);
  } catch (error) {
    // Error handled in hook
  }
};
```

5. **Reset password state when dialog closes or regenerates**:
```typescript
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    setNewPassword(null);
    setPasswordCopied(false);
    setCurrentPassword(null);
    setShowPassword(false);
  }
  onOpenChange(newOpen);
};
```

6. **Updated Security Tab UI** with three sections:
   - Dashboard URL (with copy)
   - Current Password (with view/hide and copy)
   - Regenerate Password (with confirmation dialog)

### useClients.ts Changes

Add new function to fetch client password:

```typescript
const getClientPassword = async (clientId: string): Promise<{ password: string }> => {
  const { data, error } = await supabase.functions.invoke('get-client-password', {
    body: { clientId }
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Failed to get password');

  return { password: data.password };
};
```

### AddClientDialog.tsx Changes

1. **Remove `initializeBoards` call from `handleOpenChange`** - the useEffect will handle it

2. **Add useEffect for board initialization**:
```typescript
useEffect(() => {
  if (open && !loadingBoards) {
    setBoards(
      boardConfigs.map((config) => ({
        id: config.id,
        name: config.board_name,
        selected: false,
        filterValue: "",
      }))
    );
  }
}, [open, boardConfigs, loadingBoards]);
```

3. **Simplify handleOpenChange** to only reset state on close

---

## Expected Behavior After Fix

1. **Security Tab**: 
   - Owner can click "Show Password" to view the current client password
   - Password is displayed with a copy button
   - "Hide Password" button clears it from the UI
   - "Regenerate Password" button works as before

2. **Add Client Dialog Step 2**:
   - All configured boards appear regardless of when they load
   - No filter by `target_audience` - all boards are available for client access

3. **Regenerate Password**:
   - Should work if the edge function is deployed correctly
   - If still getting 400, the issue is on the edge function side (not frontend)
