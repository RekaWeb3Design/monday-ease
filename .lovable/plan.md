

# Dashboard Improvement Plan

## Overview

Replace placeholder/hardcoded stats with real data fetched from the database, add loading states, and enhance the dashboard with recent activity and quick actions sections.

---

## Data Sources

| Stat | Source | Logic |
|------|--------|-------|
| Total Boards | `useBoardConfigs()` | Count of `configs` (active boards for current account) |
| Team Members | `useOrganizationMembers()` | Count of `members` with `status === 'active'` |
| Active Templates | `useWorkflowTemplates()` | Count of `templates` |
| Executions This Month | `useWorkflowExecutions()` | Filter `executions` where `started_at` is in current month |

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Dashboard.tsx` | UPDATE | Replace placeholders with real data, add loading states, recent activity, quick actions |

---

## Implementation Details

### 1. Import Required Hooks

```typescript
import { useBoardConfigs } from "@/hooks/useBoardConfigs";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecutions } from "@/hooks/useWorkflowExecutions";
import { useIntegration } from "@/hooks/useIntegration";
import { Skeleton } from "@/components/ui/skeleton";
```

### 2. Fetch Real Data

```typescript
const { configs, isLoading: boardsLoading } = useBoardConfigs();
const { members, isLoading: membersLoading } = useOrganizationMembers();
const { templates, isLoading: templatesLoading } = useWorkflowTemplates();
const { executions, isLoading: executionsLoading } = useWorkflowExecutions();
const { isConnected } = useIntegration();
```

### 3. Compute Stats Dynamically

```typescript
// Active team members (not pending)
const activeMembers = members.filter(m => m.status === 'active');

// Executions this month
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const executionsThisMonth = executions.filter(e => 
  e.started_at && new Date(e.started_at) >= startOfMonth
);

// Recent executions for activity feed (last 5)
const recentExecutions = executions.slice(0, 5);

// Build stats array with real values
const stats = [
  {
    title: "Total Boards",
    value: configs.length,
    description: "Configured boards",
    icon: LayoutDashboard,
    isLoading: boardsLoading,
  },
  {
    title: "Team Members",
    value: activeMembers.length,
    description: "Active members",
    icon: Users,
    isLoading: membersLoading,
  },
  {
    title: "Templates",
    value: templates.length,
    description: "Available workflows",
    icon: Zap,
    isLoading: templatesLoading,
  },
  {
    title: "Executions",
    value: executionsThisMonth.length,
    description: "This month",
    icon: TrendingUp,
    isLoading: executionsLoading,
  },
];
```

### 4. Stats Cards with Loading States

```typescript
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat) => (
    <Card key={stat.title}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <stat.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {stat.isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{stat.value}</div>
        )}
        <p className="text-xs text-muted-foreground">{stat.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

### 5. Recent Activity Section

Replace the placeholder card with a recent activity section showing the last 5 workflow executions:

```typescript
{/* Recent Activity */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Activity className="h-5 w-5" />
      Recent Activity
    </CardTitle>
  </CardHeader>
  <CardContent>
    {executionsLoading ? (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    ) : recentExecutions.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        <p>No recent workflow executions</p>
        <p className="text-sm">Run a template to see activity here</p>
      </div>
    ) : (
      <div className="space-y-3">
        {recentExecutions.map(exec => (
          <div key={exec.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <StatusIcon status={exec.status} />
              <div>
                <p className="font-medium text-sm">
                  {exec.workflow_templates?.name || 'Unknown Template'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(exec.started_at)}
                </p>
              </div>
            </div>
            <Badge variant={getStatusVariant(exec.status)}>
              {exec.status}
            </Badge>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

### 6. Quick Actions Section

Add quick action buttons for common tasks:

```typescript
{/* Quick Actions */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="h-5 w-5" />
      Quick Actions
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Button variant="outline" asChild className="justify-start">
        <Link to="/board-config">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Configure Boards
        </Link>
      </Button>
      <Button variant="outline" asChild className="justify-start">
        <Link to="/organization">
          <Users className="mr-2 h-4 w-4" />
          Manage Team
        </Link>
      </Button>
      <Button variant="outline" asChild className="justify-start">
        <Link to="/templates">
          <Zap className="mr-2 h-4 w-4" />
          Run Template
        </Link>
      </Button>
      <Button variant="outline" asChild className="justify-start">
        <Link to="/integrations">
          <Settings className="mr-2 h-4 w-4" />
          Integrations
        </Link>
      </Button>
    </div>
  </CardContent>
</Card>
```

### 7. Integration Status Banner

Show a banner if Monday.com is not connected:

```typescript
{!isConnected && (
  <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
    <CardContent className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Monday.com not connected
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Connect your account to start managing boards
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link to="/integrations">Connect Now</Link>
      </Button>
    </CardContent>
  </Card>
)}
```

---

## Helper Functions

```typescript
// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Unknown time';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Get status badge variant
function getStatusVariant(status: string) {
  switch (status) {
    case 'success': return 'default';
    case 'failed': return 'destructive';
    case 'running': return 'secondary';
    default: return 'outline';
  }
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'running':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
}
```

---

## Final Component Structure

```text
Dashboard
├── Welcome Header (with role badge)
├── Integration Warning Banner (if not connected)
├── Stats Grid (4 cards with real data + loading states)
│   ├── Total Boards
│   ├── Team Members (active only)
│   ├── Templates
│   └── Executions This Month
├── Quick Actions (4 buttons linking to key pages)
└── Recent Activity (last 5 workflow executions)
```

---

## New Imports Required

```typescript
import { Link } from "react-router-dom";
import { 
  LayoutDashboard, Users, Zap, TrendingUp, 
  Activity, Sparkles, Settings, AlertCircle,
  CheckCircle, XCircle, Clock, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Complete rewrite with real data, loading states, activity feed, quick actions |

