

# Quick Cleanup: Badge Ref, Animation Classes, Debug Logs

## 1. Badge `forwardRef` fix
**File:** `src/components/ui/badge.tsx`

Wrap `Badge` in `React.forwardRef` so it can receive refs (needed by Tooltip and other Radix primitives). Change the underlying element from `div` to `span` is not needed -- just add forwardRef.

**Before:**
```tsx
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

**After:**
```tsx
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";
```

## 2. Fix `animate-fade-in` classes in Dashboard
**File:** `src/pages/Dashboard.tsx`

Replace all 4 occurrences of `animate-fade-in` with `animate-in fade-in slide-in-from-bottom-4 duration-500`:

| Line | Current | Replacement |
|------|---------|-------------|
| 316 | `animate-fade-in` | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| 336 | `animate-fade-in` | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| 503 | `animate-fade-in` | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| 593 | `animate-fade-in` | `animate-in fade-in slide-in-from-bottom-4 duration-500` |

## 3. Remove debug `console.log` statements

**File: `src/components/clients/EditClientDialog.tsx`** -- Remove lines 149-152 and 163 (5 console.log statements). Keep `console.error` on line 168.

**File: `src/hooks/useBoardConfigs.ts`** -- Remove console.log on lines 151, 191, 210, 290 (4 statements). Keep all console.error lines.

**File: `src/components/boards/AddBoardDialog.tsx`** -- Remove lines 311-315 (5 console.log statements).

Total: 14 `console.log` debug statements removed across 3 files. Zero `console.error` lines touched.

## Files Modified

| File | Change |
|------|--------|
| `src/components/ui/badge.tsx` | Add `React.forwardRef` wrapper |
| `src/pages/Dashboard.tsx` | Replace 4x `animate-fade-in` with correct tailwindcss-animate classes |
| `src/components/clients/EditClientDialog.tsx` | Remove 5 debug console.logs |
| `src/hooks/useBoardConfigs.ts` | Remove 4 debug console.logs |
| `src/components/boards/AddBoardDialog.tsx` | Remove 5 debug console.logs |

