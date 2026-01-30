

## Workflow Templates UI Implementation

### Overview
Create a Templates page to display workflow templates and allow users to execute them, plus an Execution History page to track past executions.

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       Templates Page (/templates)                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Header: "Workflow Templates"                                 │   │
│  │ Description: "Automate your Monday.com workflows"            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  TemplateCard   │  │  TemplateCard   │  │  TemplateCard   │     │
│  │  - Icon         │  │  - Icon         │  │  - Icon         │     │
│  │  - Name         │  │  - Name         │  │  - Name         │     │
│  │  - Description  │  │  - Description  │  │  - Description  │     │
│  │  - Category     │  │  - Category     │  │  - Category     │     │
│  │  [Premium]      │  │  [Run]          │  │  [Run]          │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │   ExecuteTemplateDialog (when Run clicked)                   │   │
│  │   - Template name                                            │   │
│  │   - Board selection (from Monday.com boards)                 │   │
│  │   - Task name input                                          │   │
│  │   - Execute button                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Execution History (/activity)                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Header: "Execution History"                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Table:                                                       │   │
│  │  Template Name  |  Status  |  Started At  |  Duration       │   │
│  │  Create Task    |  [done]  |  2 min ago   |  1.2s           │   │
│  │  Sync Board     |  [fail]  |  5 min ago   |  0.8s           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Templates.tsx` | Main templates page with grid |
| `src/pages/ExecutionHistory.tsx` | Execution history page |
| `src/hooks/useWorkflowTemplates.ts` | Fetch active templates from DB |
| `src/hooks/useWorkflowExecutions.ts` | Fetch/create executions |
| `src/components/templates/TemplateCard.tsx` | Card for each template |
| `src/components/templates/ExecuteTemplateDialog.tsx` | Run template dialog |

### Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add WorkflowTemplate and WorkflowExecution types |
| `src/App.tsx` | Add routes for `/templates` and `/activity` |

---

### Implementation Details

#### 1. Types (`src/types/index.ts`)

Add two new interfaces for workflow functionality:

```typescript
// Workflow template from database
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  n8n_webhook_url: string;
  input_schema: Record<string, any>;
  is_active: boolean;
  is_premium: boolean;
  execution_count: number;
  created_at: string;
}

// Workflow execution record
export interface WorkflowExecution {
  id: string;
  template_id: string | null;
  organization_id: string;
  user_id: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  input_params: Record<string, any>;
  output_result: Record<string, any> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  execution_time_ms: number | null;
  created_at: string;
  workflow_templates?: WorkflowTemplate;
}
```

#### 2. useWorkflowTemplates Hook (`src/hooks/useWorkflowTemplates.ts`)

Hook to fetch active templates from the `workflow_templates` table:

```typescript
export function useWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    // Query workflow_templates where is_active = true
    // Order by execution_count desc (popular first)
    // Handle errors with toast
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, isLoading, error, refetch: fetchTemplates };
}
```

#### 3. useWorkflowExecutions Hook (`src/hooks/useWorkflowExecutions.ts`)

Hook to fetch and create execution records:

```typescript
export function useWorkflowExecutions() {
  const { organization } = useAuth();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExecutions = useCallback(async () => {
    // Query workflow_executions for current organization
    // Join with workflow_templates to get template name
    // Order by started_at desc (newest first)
    // Limit to 50 recent executions
  }, [organization]);

  const createExecution = useCallback(async (
    templateId: string,
    inputParams: Record<string, any>
  ): Promise<boolean> => {
    // Insert new execution with status 'pending'
    // Show toast: "Workflow queued"
    // Return success/failure
  }, [organization]);

  return { executions, isLoading, createExecution, refetch: fetchExecutions };
}
```

#### 4. TemplateCard Component (`src/components/templates/TemplateCard.tsx`)

Card displaying a single template:

```typescript
interface TemplateCardProps {
  template: WorkflowTemplate;
  onRun: (template: WorkflowTemplate) => void;
}

export function TemplateCard({ template, onRun }: TemplateCardProps) {
  // Dynamic icon from lucide-react using template.icon field
  // Map common icon names: "zap", "calendar", "mail", etc.
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconComponent className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>{template.name}</CardTitle>
              {template.is_premium && (
                <Badge className="bg-[#ffcd03] text-black">Premium</Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline">{template.category}</Badge>
            <span className="text-xs text-muted-foreground">
              {template.execution_count} runs
            </span>
          </div>
          <Button onClick={() => onRun(template)}>
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 5. ExecuteTemplateDialog Component (`src/components/templates/ExecuteTemplateDialog.tsx`)

Dialog for running a template:

```typescript
interface ExecuteTemplateDialogProps {
  template: WorkflowTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExecuteTemplateDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: ExecuteTemplateDialogProps) {
  const { boards, fetchBoards } = useMondayBoards();
  const { createExecution } = useWorkflowExecutions();
  
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch boards when dialog opens
  // Handle execute: create execution record with input_params
  // Show toast on success/failure
  // Reset form and close dialog

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run: {template?.name}</DialogTitle>
          <DialogDescription>
            Configure the workflow parameters
          </DialogDescription>
        </DialogHeader>
        
        {/* Board selection dropdown */}
        <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a board..." />
          </SelectTrigger>
          <SelectContent>
            {boards.map((board) => (
              <SelectItem key={board.id} value={board.id}>
                {board.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Task name input */}
        <Input
          placeholder="Task name (optional)"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExecute} disabled={!selectedBoardId || isExecuting}>
            {isExecuting ? <Loader2 /> : "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 6. Templates Page (`src/pages/Templates.tsx`)

Main templates page:

```typescript
export default function Templates() {
  const { templates, isLoading } = useWorkflowTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRun = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Workflow Templates</h1>
        <p className="text-muted-foreground">
          Automate your Monday.com workflows with pre-built templates
        </p>
      </div>

      {/* Empty state or grid */}
      {templates.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No templates available"
          description="Check back soon for new automation templates."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onRun={handleRun}
            />
          ))}
        </div>
      )}

      <ExecuteTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setDialogOpen(false)}
      />
    </div>
  );
}
```

#### 7. ExecutionHistory Page (`src/pages/ExecutionHistory.tsx`)

Execution history page with table:

```typescript
export default function ExecutionHistory() {
  const { executions, isLoading, refetch } = useWorkflowExecutions();

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-[#01cb72]">Success</Badge>;
      case "failed":
        return <Badge className="bg-[#fb275d]">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-500">Running</Badge>;
      case "pending":
        return <Badge className="bg-[#ffcd03] text-black">Pending</Badge>;
    }
  };

  // Duration formatter
  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Execution History</h1>
          <p className="text-muted-foreground">
            Track your workflow execution results
          </p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : executions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No executions yet"
          description="Run a workflow template to see execution history here."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell>
                    {exec.workflow_templates?.name || "Unknown"}
                  </TableCell>
                  <TableCell>{getStatusBadge(exec.status)}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(exec.started_at))} ago
                  </TableCell>
                  <TableCell>
                    {formatDuration(exec.execution_time_ms)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
```

#### 8. App.tsx Routes Update

Add routes for Templates and ExecutionHistory:

```typescript
// Add imports
import Templates from "./pages/Templates";
import ExecutionHistory from "./pages/ExecutionHistory";

// Add routes (before catch-all):
<Route
  path="/templates"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Templates">
          <Templates />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
<Route
  path="/activity"
  element={
    <ProtectedRoute>
      <RequireOrganization>
        <AppLayout pageTitle="Activity">
          <ExecutionHistory />
        </AppLayout>
      </RequireOrganization>
    </ProtectedRoute>
  }
/>
```

---

### Dynamic Icon Mapping

For `TemplateCard`, map the icon string to lucide-react components:

```typescript
import * as Icons from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  zap: Icons.Zap,
  calendar: Icons.Calendar,
  mail: Icons.Mail,
  clipboard: Icons.Clipboard,
  "file-text": Icons.FileText,
  users: Icons.Users,
  bell: Icons.Bell,
  check: Icons.Check,
  send: Icons.Send,
  settings: Icons.Settings,
};

function getIcon(iconName: string): React.ComponentType<any> {
  return iconMap[iconName.toLowerCase()] || Icons.Zap;
}
```

---

### Status Badge Colors

Consistent with project branding:

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| Success | Green (#01cb72) | `bg-[#01cb72] text-white` |
| Failed | Red (#fb275d) | `bg-[#fb275d] text-white` |
| Running | Blue | `bg-blue-500 text-white` |
| Pending | Yellow (#ffcd03) | `bg-[#ffcd03] text-black` |

---

### Database Integration

The implementation uses existing tables:

**workflow_templates table:**
- RLS allows SELECT for active templates (is_active = true)
- No INSERT/UPDATE/DELETE for regular users

**workflow_executions table:**
- RLS allows INSERT for org members
- RLS allows SELECT for org members
- Service role can UPDATE (for status changes)

---

### Key Implementation Notes

1. **No n8n calls yet** - Only create execution records with status 'pending'
2. **Follow existing patterns** - Use same structure as BoardConfig, useBoardConfigs
3. **Empty states** - Friendly messages with relevant icons
4. **Loading states** - Use Loader2 spinner consistently
5. **Toast notifications** - "Workflow queued" on successful execution creation
6. **Date formatting** - Use date-fns formatDistanceToNow for relative times

