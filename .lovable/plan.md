
# UX Improvements for Board Configuration Page

## Overview

Add three UX improvements to enhance the Board Configuration page: a quick switch button for inactive boards, a delete option for inactive boards, and a more prominent "Connected to" indicator.

---

## Changes Summary

| File | Changes |
|------|---------|
| `src/components/boards/InactiveBoardCard.tsx` | Add "Switch to [workspace]" button with navigation; Add delete button with confirmation dialog |
| `src/pages/BoardConfig.tsx` | Pass `deleteConfig` to `InactiveBoardCard`; Update header with prominent Badge component |

---

## 1. Quick Switch Button on Inactive Boards

### `InactiveBoardCard.tsx`

Replace the static info message with a clickable button that navigates to the integrations page.

**Changes:**
- Add `useNavigate` from `react-router-dom`
- Add `ArrowRightLeft` icon from `lucide-react`
- Add `Button` component import
- Replace the info div with an actionable button

```tsx
// Before
<div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
  <Info className="h-3.5 w-3.5 flex-shrink-0" />
  <span>Connect to this Monday.com account to manage this board</span>
</div>

// After
<Button 
  variant="ghost" 
  size="sm" 
  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
  onClick={() => navigate("/integrations")}
>
  <ArrowRightLeft className="h-3.5 w-3.5" />
  Switch to {config.workspace_name || "this account"}
</Button>
```

---

## 2. Delete Button for Inactive Boards

### `InactiveBoardCard.tsx`

Add a delete button with confirmation dialog in the card header, styled subtly to match the inactive state.

**Changes:**
- Add `AlertDialog` components import
- Add `Trash2` icon import
- Update props interface to accept `onDelete` callback
- Add delete button in header with confirmation dialog

```tsx
interface InactiveBoardCardProps {
  config: BoardConfigWithAccess;
  onDelete: () => void;  // NEW PROP
}

// In CardHeader, add delete button
<div className="flex items-start justify-between">
  <div className="space-y-1">
    <CardTitle className="text-lg">{config.board_name}</CardTitle>
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      Other Account
    </Badge>
  </div>
  {/* NEW: Delete button */}
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-60 hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Board Configuration?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete the "{config.board_name}" configuration. 
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={onDelete}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
```

### `BoardConfig.tsx`

Pass the `deleteConfig` function to each `InactiveBoardCard`.

```tsx
// Before
<InactiveBoardCard key={config.id} config={config} />

// After
<InactiveBoardCard 
  key={config.id} 
  config={config} 
  onDelete={() => deleteConfig(config.id)} 
/>
```

---

## 3. Prominent "Connected to" Header Badge

### `BoardConfig.tsx`

Replace the plain text indicator with a visually prominent Badge with a pulse animation.

**Changes:**
- Import `Badge` component
- Replace text-based indicator with styled Badge

```tsx
// Before
{integration?.workspace_name && (
  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
    <Link className="h-4 w-4 text-[#01cb72]" />
    <span>Connected to:</span>
    <span className="font-medium text-foreground">
      {integration.workspace_name}
    </span>
  </div>
)}

// After
{integration?.workspace_name && (
  <Badge 
    variant="outline" 
    className="mt-2 bg-green-50 text-green-700 border-green-200 gap-2"
  >
    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    Connected to: {integration.workspace_name}
  </Badge>
)}
```

---

## Visual Preview

### Inactive Board Card (After)

```text
┌────────────────────────────────────────┐
│  Tasks                          [🗑]   │  ← Delete button (subtle)
│  ┌──────────────┐                      │
│  │ Other Account│                      │
│  └──────────────┘                      │
│                                        │
│  Filter Column: Person                 │
│  Visible Columns: 5 selected           │
│  Members with Access: 3                │
│                                        │
│  [↔ Switch to Thewowstudio]            │  ← Clickable button
└────────────────────────────────────────┘
```

### Header (After)

```text
┌────────────────────────────────────────────────────────────┐
│  Board Configuration                        [+ Add Board]  │
│  Configure Monday.com boards and member access             │
│  ┌─────────────────────────────────────┐                   │
│  │ 🟢 Connected to: MondayEase         │  ← Badge with    │
│  └─────────────────────────────────────┘    pulse dot     │
└────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### New Imports for InactiveBoardCard.tsx

```tsx
import { useNavigate } from "react-router-dom";
import { Info, Filter, Columns, Users, Trash2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

### New Import for BoardConfig.tsx

```tsx
import { Badge } from "@/components/ui/badge";
```

---

## Files Modified

1. **`src/components/boards/InactiveBoardCard.tsx`** - Major update
   - Add navigation hook and delete functionality
   - New props interface with `onDelete`
   - Replace info message with switch button
   - Add delete button with AlertDialog

2. **`src/pages/BoardConfig.tsx`** - Minor update
   - Import Badge component
   - Update header with prominent Badge
   - Pass `onDelete` prop to InactiveBoardCard
