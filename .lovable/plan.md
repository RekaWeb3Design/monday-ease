
# Fix Edit Client Dialog - Boards Tab Empty

## Problem
The Boards tab in the Edit Client dialog shows no boards even though board configurations exist. The issue is a timing/race condition where:

1. Dialog opens → triggers `loadBoardAccess()` in useEffect
2. But `useBoardConfigs()` data hasn't loaded yet → `boardConfigs` is empty
3. The boards state is set to an empty array and never updated when configs load

## Solution
Add a `useEffect` that watches `boardConfigs` and re-runs `loadBoardAccess()` when the configs become available.

## Technical Changes

### File: `src/components/clients/EditClientDialog.tsx`

Add a new `useEffect` that watches for `boardConfigs` changes:

```typescript
// Re-load boards when boardConfigs changes (handles async loading)
useEffect(() => {
  if (open && boardConfigs.length > 0 && boards.length === 0 && !loadingAccess) {
    loadBoardAccess();
  }
}, [boardConfigs, open]);
```

This ensures that:
- When dialog is open AND
- boardConfigs have loaded (length > 0) AND  
- boards are still empty AND
- We're not already loading

Then we trigger `loadBoardAccess()` to populate the boards list.

## Expected Result
- Open Edit Client dialog → Boards tab shows all configured boards with correct selection state
- Boards display immediately if already loaded, or after a brief loading spinner if fetching
