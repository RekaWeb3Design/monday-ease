

## Comprehensive Audit: AddBoardDialog Closes on Tab Switch

### Root Cause Analysis

After thorough investigation, I've identified the **actual root cause** that the previous fixes missed:

**The Problem Chain:**
1. The `AddBoardDialog` component uses the parent's `open` prop in a `useEffect` that **resets all state when `open` becomes false** (lines 230-247)
2. The component also has an `internalOpen` state that syncs from the parent `open` prop
3. However, the parent component (`BoardConfig.tsx`) uses `useBoardConfigs()` which calls `useQuery` from TanStack Query
4. **Critical Issue:** The `useOrganizationMembers()` hook used in `BoardConfig.tsx` does NOT have `refetchOnWindowFocus: false` - it uses plain `useState/useEffect` pattern which triggers `fetchMembers()` on mount
5. When switching tabs and returning, if any data changes or re-renders occur in the parent, React may re-render `BoardConfig`, and subtle race conditions with the portal-based Dialog can cause issues

**The Real Problem (discovered by elimination):**
Looking at the current implementation:
- `internalOpen` state IS used correctly
- `onOpenChange={() => {}}` DOES block automatic closes
- `modal={false}` SHOULD disable focus tracking
- All event handlers have `preventDefault()`

**So why is it still closing?**

The issue is that `modal={false}` with Radix Dialog creates a **non-modal dialog that doesn't use a portal overlay** in the same way. When combined with `onInteractOutside`, `onFocusOutside`, etc., there's a conflict where the dialog content may still receive focus-loss events that aren't properly intercepted.

Additionally, Radix Dialog's internal focus management with `modal={false}` behaves differently - it doesn't trap focus but still tracks it, and browser tab switches can trigger internal cleanup.

### The Real Solution

The most robust solution is to **completely bypass Radix UI's Dialog closing mechanism** by:

1. **Remove the dependency on the parent `open` prop entirely for the Dialog component**
2. **Use a completely controlled pattern where the Dialog never receives close signals from Radix internals**
3. **Keep `modal={true}` (the default) but fully intercept ALL closing mechanisms**

### Implementation Plan

#### Step 1: Refactor State Management in AddBoardDialog.tsx

```typescript
// Current problematic pattern:
const [internalOpen, setInternalOpen] = useState(false);
useEffect(() => {
  if (open && !internalOpen) {
    setInternalOpen(true);
  }
}, [open, internalOpen]);

// The issue: when 'open' changes for ANY reason, this can trigger

// Solution: Only sync on mount/open, never let parent close affect internal state
const [internalOpen, setInternalOpen] = useState(false);
const hasInitialized = useRef(false);

useEffect(() => {
  // Only sync when parent explicitly opens the dialog
  if (open && !hasInitialized.current) {
    setInternalOpen(true);
    hasInitialized.current = true;
  }
  // When parent closes (after our handleClose), reset for next open
  if (!open) {
    hasInitialized.current = false;
  }
}, [open]);
```

#### Step 2: Change Dialog Configuration

Keep `modal={true}` (default) but ensure ALL closing paths are blocked:

```tsx
<Dialog 
  open={internalOpen} 
  onOpenChange={(isOpen) => {
    // ONLY allow opening from parent, never closing
    // This callback is triggered by Radix for any close attempt
    // We completely ignore it
  }}
  // Remove modal={false} - let it be modal but intercept closes
>
```

#### Step 3: Update DialogContent to Block All Events

The DialogContent already has the right handlers, but ensure they're on the content level:

```tsx
<DialogContent 
  className="max-w-lg"
  hideCloseButton
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
  // Add this - blocks Radix's internal close on overlay click
  onOpenAutoFocus={(e) => e.preventDefault()}
>
```

Wait - after further research, there's a simpler fix that's been missed:

#### Step 4: The ACTUAL Fix - DialogOverlay Click

Looking at the `dialog.tsx` component, the `DialogOverlay` doesn't have any click prevention. In Radix Dialog, clicking the overlay triggers `onOpenChange(false)`. Even though we blocked `onOpenChange`, the overlay may still be receiving and processing events.

**The fix must also include the overlay!**

Modify `src/components/ui/dialog.tsx` to accept an `onOverlayClick` prop or add `pointer-events: none` to overlay when needed.

However, the most reliable approach is:

#### Alternative: Create a Stable Dialog Wrapper

Create a custom `StableDialog` component that:
1. Renders the dialog content inside a div with `position: fixed` and proper z-index
2. Handles its own backdrop
3. Doesn't rely on Radix's focus/close management at all

### Recommended Solution Summary

1. **File: `src/components/boards/AddBoardDialog.tsx`**
   - Add a `useRef` to track initialization state
   - Modify the `useEffect` that syncs `internalOpen` to only respond to explicit opens
   - Change the reset `useEffect` to only reset when `internalOpen` becomes false (not when parent `open` changes)

2. **File: `src/components/ui/dialog.tsx`** (optional enhancement)
   - Add `preventOverlayClose` prop to DialogContent that prevents overlay clicks from closing

### Technical Details

**Changes to AddBoardDialog.tsx:**

```typescript
// Add import
import { useRef } from "react";

// Replace the internalOpen state and effect with:
const [internalOpen, setInternalOpen] = useState(false);
const openRequestRef = useRef(false);

// Handle parent wanting to open
useEffect(() => {
  if (open && !openRequestRef.current) {
    openRequestRef.current = true;
    setInternalOpen(true);
  }
}, [open]);

// Handle close - reset the ref for next open
const handleClose = () => {
  setInternalOpen(false);
  openRequestRef.current = false;
  onOpenChange(false);
};

// Change the reset effect to watch internalOpen, not open
useEffect(() => {
  if (!internalOpen) {
    // Reset all form state
    setCurrentStepIndex(0);
    // ... rest of reset logic
  }
}, [internalOpen]);
```

**Keep Dialog configuration with modal={true}:**

```tsx
<Dialog 
  open={internalOpen} 
  onOpenChange={() => {
    // Completely ignore - only handleClose() can close
  }}
>
```

This ensures that:
- The dialog only opens when explicitly requested
- The dialog never closes from Radix's internal mechanisms (focus loss, overlay click, escape, tab switch)
- The dialog only closes when `handleClose()` is explicitly called
- State resets properly after intentional close

