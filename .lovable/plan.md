

## Member Dashboard Implementation

### Overview
Create a simplified dashboard for team members (non-owners) to view their filtered tasks from Monday.com based on their assigned board access and filter values.

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       MemberDashboard Page                          │
│  /member (protected, accessible to all roles)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Header: "My Tasks"                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      TaskStats                               │   │
│  │  [Total: 12]    [In Progress: 5]    [Done: 7]               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  TaskCard    │  │  TaskCard    │  │  TaskCard    │   ...        │
│  │  - Name      │  │  - Name      │  │  - Name      │              │
│  │  - Board     │  │  - Board     │  │  - Board     │              │
│  │  - Status    │  │  - Status    │  │  - Status    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        Empty State (if no tasks assigned)                    │   │
│  │  "No tasks assigned to you yet" + friendly message           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/MemberDashboard.tsx` | Main member dashboard page |
| `src/hooks/useMemberTasks.ts` | Hook to fetch tasks from edge function |
| `src/components/member/TaskCard.tsx` | Card displaying individual task |
| `src/components/member/TaskStats.tsx` | Stats cards showing task counts |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Update nav for member vs owner roles |
| `src/App.tsx` | Add route for `/member` |
| `src/types/index.ts` | Add MondayTask type |

---

### Implementation Details

#### 1. Types (`src/types/index.ts`)

Add new types for Monday.com tasks:

```typescript
// Monday.com task item from API
export interface MondayTask {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
}

// Column value from Monday.com
export interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: any;
}
```

#### 2. useMemberTasks Hook (`src/hooks/useMemberTasks.ts`)

Hook that calls the `get-member-tasks` Edge Function:

```typescript
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { MondayTask } from "@/types";

interface UseMemberTasksReturn {
  tasks: MondayTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMemberTasks(): UseMemberTasksReturn {
  // State for tasks, loading, error
  // fetchTasks function that:
  //   1. Gets JWT token from supabase.auth.getSession()
  //   2. Calls https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-member-tasks
  //   3. Passes Authorization: Bearer {token} header
  //   4. Returns tasks array or shows error toast
  // Auto-fetch on mount via useEffect
  // Return { tasks, isLoading, error, refetch }
}
```

#### 3. TaskStats Component (`src/components/member/TaskStats.tsx`)

Stats cards showing task counts by status:

```typescript
interface TaskStatsProps {
  tasks: MondayTask[];
}

export function TaskStats({ tasks }: TaskStatsProps) {
  // Calculate stats from tasks:
  // - Total Tasks count
  // - Group by status column if exists
  // - Show In Progress, Done counts
  
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>Total Tasks</CardHeader>
        <CardContent>{total}</CardContent>
      </Card>
      {/* Additional status-based cards */}
    </div>
  );
}
```

#### 4. TaskCard Component (`src/components/member/TaskCard.tsx`)

Card displaying individual task:

```typescript
interface TaskCardProps {
  task: MondayTask;
}

export function TaskCard({ task }: TaskCardProps) {
  // Helper to find status column value
  // Helper to get status color based on value
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{task.name}</CardTitle>
          <Badge>{task.board_name}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Display visible column values */}
        {/* Status badge with color */}
      </CardContent>
    </Card>
  );
}
```

#### 5. MemberDashboard Page (`src/pages/MemberDashboard.tsx`)

Main dashboard page:

```typescript
export default function MemberDashboard() {
  const { profile } = useAuth();
  const { tasks, isLoading, error, refetch } = useMemberTasks();

  const displayName = profile?.full_name || "there";

  // Loading state with spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Empty state if no tasks
  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState
          title="No tasks assigned to you yet"
          description="Once your team owner assigns you to tasks, they'll appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName}! Here are your assigned tasks.
        </p>
      </div>

      {/* Stats row */}
      <TaskStats tasks={tasks} />

      {/* Task grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
```

#### 6. AppSidebar Update (`src/components/layout/AppSidebar.tsx`)

Update navigation based on user role:

```typescript
// Define base nav items (available to all)
const baseNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

// Owner nav items
const ownerNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Organization", url: "/organization", icon: Building2 },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Boards", url: "/boards", icon: LayoutGrid },
  { title: "Templates", url: "/templates", icon: Zap },
  { title: "Activity", url: "/activity", icon: Activity },
];

// Member nav items
const memberNavItems: NavItem[] = [
  { title: "My Tasks", url: "/member", icon: ClipboardList },
];

// In render:
const displayNavItems = isOwner 
  ? [...ownerNavItems, ...baseNavItems]
  : [...memberNavItems, ...baseNavItems];
```

#### 7. App.tsx Update

Add route for member dashboard and auto-redirect logic:

```typescript
// Add import
import MemberDashboard from "./pages/MemberDashboard";

// Add route before catch-all:
<Route
  path="/member"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="My Tasks">
          <MemberDashboard />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>

// Modify "/" route to use a smart redirect component:
<Route
  path="/"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <DashboardRedirect />
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

#### 8. Create DashboardRedirect Component

Component that redirects based on role:

```typescript
// src/components/auth/DashboardRedirect.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function DashboardRedirect() {
  const { memberRole, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Members go to /member, owners go to dashboard
  if (memberRole !== "owner") {
    return <Navigate to="/member" replace />;
  }

  // Owners see the main dashboard
  return (
    <AppLayout pageTitle="Dashboard">
      <Dashboard />
    </AppLayout>
  );
}
```

---

### Status Badge Colors

The TaskCard will use consistent colors for status badges:

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| Done / Completed | Green (#01cb72) | `bg-[#01cb72] text-white` |
| In Progress / Working | Yellow (#ffcd03) | `bg-[#ffcd03] text-black` |
| Stuck / Blocked | Red (#fb275d) | `bg-[#fb275d] text-white` |
| Default | Gray | `bg-gray-100 text-gray-800` |

---

### Edge Function Dependency

The implementation assumes the `get-member-tasks` Edge Function exists at:
`https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1/get-member-tasks`

Expected behavior:
- Accepts JWT in Authorization header
- Identifies calling member from token
- Looks up member's board access in `member_board_access`
- Uses OWNER's Monday.com token to fetch items
- Filters items by member's filter_value
- Returns only visible_columns for each board config

If the Edge Function is not yet deployed, I will create it as part of this implementation.

---

### Technical Notes

**Authentication Flow:**
1. Member logs in via email/password
2. JWT token identifies the member
3. Edge function uses member's org to find owner
4. Owner's Monday.com token is used for API calls
5. Items are filtered based on member_board_access table

**Empty State UX:**
- Friendly message: "No tasks assigned to you yet"
- Helpful subtext: "Once your team owner assigns you to tasks, they'll appear here."
- Uses MondayEase logo for branding

**Loading States:**
- Full page loader while fetching tasks
- Skeleton cards could be used for smoother UX

