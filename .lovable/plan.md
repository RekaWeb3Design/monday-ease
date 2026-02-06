

# Fix: Add Board Configuration Modal Not Closing After Save

## Problem Identified

The "Add Board Configuration" modal does not close and does not show a success message after saving.

## Root Cause

The `AddBoardDialog` component uses a special internal state pattern (`internalOpen`) to prevent unwanted dialog closures (e.g., from background refetches). However, the `handleSubmit` function calls `onOpenChange(false)` instead of `handleClose()`, which is the only function that actually sets `internalOpen` to `false`.

**Current Code (line 325-328):**
```typescript
if (success) {
  onOpenChange(false);  // ← Does nothing! Dialog ignores this.
  onSuccess();
}
```

**Required Fix:**
```typescript
if (success) {
  handleClose();  // ← Properly closes dialog AND resets form state
  onSuccess();
}
```

## Technical Details

The dialog's architecture:
- Uses `internalOpen` state (line 345) that controls visibility
- The `Dialog` component's `onOpenChange` is set to an empty function (line 371-374)
- `handleClose()` (line 361-366) is the ONLY function that sets `internalOpen = false`
- Toast success message is already shown by `useBoardConfigs.createConfig()` (line 219-222)

## File to Modify

**`src/components/boards/AddBoardDialog.tsx`**

Change lines 325-328 from:
```typescript
if (success) {
  onOpenChange(false);
  onSuccess();
}
```

To:
```typescript
if (success) {
  handleClose();
  onSuccess();
}
```

## Expected Behavior After Fix

1. User completes wizard and clicks "Save & Finish"
2. Board configuration is created in database
3. Toast appears: "Board Added - {board_name} has been configured successfully."
4. Dialog closes automatically
5. Board list refreshes showing the new configuration

## What This Does NOT Change

- The dialog stability pattern (prevents unwanted closures during tab switches)
- The X button behavior (still uses `handleClose()`)
- The Cancel button behavior
- The toast messages (already work correctly in the hook)

