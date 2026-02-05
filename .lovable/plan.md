

# Getting Started Checklist Implementation

## Overview

Add an interactive onboarding checklist to the dashboard that shows new users their setup progress with clear action items. The checklist automatically tracks completion based on real data and hides once all steps are complete (with option to dismiss early).

---

## Onboarding Steps

| Step | Description | Completion Check | Link |
|------|-------------|------------------|------|
| Connect Monday.com | Link your Monday.com account | `isConnected === true` | /integrations |
| Configure Your First Board | Set up a board for your team | `configs.length > 0` | /board-config |
| Invite Team Members | Add colleagues to your organization | `activeMembers.length > 1` (excluding owner) | /organization |
| Create a Custom View | Build a tailored view for members | `views.length > 0` | /board-views |
| Run Your First Workflow | Execute an automation template | `executions.length > 0` | /templates |

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/GettingStartedChecklist.tsx` | CREATE | New component with checklist UI and progress tracking |
| `src/pages/Dashboard.tsx` | UPDATE | Import and render the checklist component |

---

## Technical Details

### 1. GettingStartedChecklist.tsx (NEW)

```typescript
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  CheckCircle2, Circle, ChevronRight, X, 
  Rocket, ExternalLink, LayoutDashboard,
  Users, Zap, Eye, Cable
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  href: string;
}

interface GettingStartedChecklistProps {
  isConnected: boolean;
  boardCount: number;
  memberCount: number;  // Active members only
  viewCount: number;
  executionCount: number;
  isLoading: boolean;
}
```

### 2. Component Features

**Progress Tracking**
- Visual progress bar showing percentage complete
- "X of 5 steps completed" label
- Animated transitions when steps complete

**Step Display**
- Each step shows icon, title, description
- Completed steps show green checkmark
- Incomplete steps are clickable with arrow indicator
- Links navigate to relevant page

**Dismissal Options**
- "Dismiss" button to hide checklist early (stored in localStorage)
- Auto-hide when all 5 steps complete
- "Show Getting Started" button in a collapsed state if dismissed

**Loading State**
- Show skeleton while data loads
- Don't show incomplete steps until data is ready

### 3. Local Storage for Dismissal

```typescript
const STORAGE_KEY = "mondayease_onboarding_dismissed";

// Check if dismissed
const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";

// Dismiss handler
const handleDismiss = () => {
  localStorage.setItem(STORAGE_KEY, "true");
  setShowChecklist(false);
};

// Show again handler
const handleShowAgain = () => {
  localStorage.removeItem(STORAGE_KEY);
  setShowChecklist(true);
};
```

### 4. Dashboard Integration

Update Dashboard.tsx to:
1. Import the new `GettingStartedChecklist` component
2. Import `useCustomBoardViews` hook
3. Pass the required props based on existing data
4. Render between the warning banner and stats grid

```typescript
// Add import
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist";
import { useCustomBoardViews } from "@/hooks/useCustomBoardViews";

// In component
const { views, isLoading: viewsLoading } = useCustomBoardViews();

// Active members excluding the current user (owner)
const otherActiveMembers = members.filter(
  m => m.status === 'active' && m.user_id !== user?.id
);

// Render checklist (only for owners)
{memberRole === 'owner' && (
  <GettingStartedChecklist
    isConnected={isConnected}
    boardCount={configs.length}
    memberCount={otherActiveMembers.length}
    viewCount={views.length}
    executionCount={executions.length}
    isLoading={boardsLoading || membersLoading || viewsLoading || executionsLoading}
  />
)}
```

---

## UI Design

```text
┌─────────────────────────────────────────────────────────────┐
│  🚀 Getting Started                              [Dismiss X]│
├─────────────────────────────────────────────────────────────┤
│  ████████████░░░░░░░░░░░  2 of 5 steps completed           │
├─────────────────────────────────────────────────────────────┤
│  ✓  Connect Monday.com                                      │
│     Link your account to sync boards               [Done]   │
├─────────────────────────────────────────────────────────────┤
│  ✓  Configure Your First Board                              │
│     Set up a board for task management             [Done]   │
├─────────────────────────────────────────────────────────────┤
│  ○  Invite Team Members                                   → │
│     Add colleagues to collaborate                           │
├─────────────────────────────────────────────────────────────┤
│  ○  Create a Custom View                                  → │
│     Build tailored views for your team                      │
├─────────────────────────────────────────────────────────────┤
│  ○  Run Your First Workflow                               → │
│     Execute an automation template                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Styling

- Use existing shadcn/ui Card, Button, Progress components
- Primary color (`#01cb72`) for completed checkmarks and progress bar
- Muted styling for incomplete steps
- Hover state on clickable incomplete steps
- Smooth transitions for progress updates

---

## Edge Cases

1. **New user with no data**: Show all steps as incomplete
2. **Returning user with all complete**: Hide checklist (or show "All done!" message)
3. **Dismissed but incomplete**: Show small "Resume setup" button
4. **Member role (non-owner)**: Don't show checklist (onboarding is for owners)
5. **Loading state**: Show skeleton to prevent flicker

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/dashboard/GettingStartedChecklist.tsx` | New component with progress tracking, step list, dismiss functionality |
| `src/pages/Dashboard.tsx` | Import and render checklist, add `useCustomBoardViews` hook |

