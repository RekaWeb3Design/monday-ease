
# Workflow Templates UI and Member Quick Actions

## Overview
This plan updates the existing workflow system to use the deployed `execute-workflow` Edge Function and adds Quick Actions for team members on their dashboard.

---

## What Will Be Changed

### For Organization Owners
- Update execution hook to call the Edge Function instead of direct DB insert
- Add "Run By" column to Execution History table
- Improve execution feedback with success/error states and timing

### For Team Members
- Add Quick Actions section to Member Dashboard with workflow template cards
- Add Recent Activity section showing member's last 5 executions
- Add "Activity" link to member sidebar navigation

---

## Implementation Tasks

### Task 1: Update useWorkflowExecutions Hook

Modify the `createExecution` function to call the Edge Function:

**File:** `src/hooks/useWorkflowExecutions.ts`

Changes:
- Replace direct `supabase.from("workflow_executions").insert()` with `supabase.functions.invoke('execute-workflow')`
- Update return type to include execution result with timing
- Add user email field to execution fetching by including user_profiles join in the query
- Update the WorkflowExecution type to include optional user_email field

**Type update:** `src/types/index.ts`
- Add `user_email?: string` to WorkflowExecution interface

---

### Task 2: Update ExecuteTemplateDialog

Enhance the dialog with better execution feedback:

**File:** `src/components/templates/ExecuteTemplateDialog.tsx`

Changes:
- Add success/error result state after execution completes
- Show execution time in success state
- Display error message in error state  
- Add "Run Another" button to reset the form
- Improve visual feedback during execution

---

### Task 3: Update Execution History Page

Add "Run By" column to show who triggered each execution:

**File:** `src/pages/ExecutionHistory.tsx`

Changes:
- Add "Run By" column between "Template" and "Status"
- Display user email from the joined data
- Add optional status filter dropdown (All, Pending, Running, Success, Failed)

---

### Task 4: Create QuickActions Component for Members

New component showing compact workflow template cards:

**File:** `src/components/member/QuickActions.tsx`

Features:
- Grid of smaller template cards (compared to owner view)
- Uses existing `useWorkflowTemplates` hook
- Clicking a card opens `ExecuteTemplateDialog`
- Compact layout suitable for dashboard section

---

### Task 5: Create RecentActivity Component for Members

New component showing member's recent executions:

**File:** `src/components/member/RecentActivity.tsx`

Features:
- List of last 5 executions for the current user
- Shows template name, status badge, and relative time
- Uses filtered data from `useWorkflowExecutions`
- Compact list format

---

### Task 6: Update Member Dashboard

Integrate the new components:

**File:** `src/pages/MemberDashboard.tsx`

Changes:
- Import QuickActions and RecentActivity components
- Add Quick Actions section above the tasks grid
- Add Recent Activity section below Quick Actions
- Maintain existing task display functionality

---

### Task 7: Update Sidebar Navigation

Add Activity link for members:

**File:** `src/components/layout/AppSidebar.tsx`

Changes:
- Add "Activity" to `memberNavItems` array
- Use Activity icon
- Link to `/activity` route

---

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| Update | `src/types/index.ts` | Add user_email to WorkflowExecution |
| Update | `src/hooks/useWorkflowExecutions.ts` | Call Edge Function, join user email |
| Update | `src/components/templates/ExecuteTemplateDialog.tsx` | Better execution feedback |
| Update | `src/pages/ExecutionHistory.tsx` | Add "Run By" column + status filter |
| Create | `src/components/member/QuickActions.tsx` | Template cards for members |
| Create | `src/components/member/RecentActivity.tsx` | Recent executions list |
| Update | `src/pages/MemberDashboard.tsx` | Integrate new components |
| Update | `src/components/layout/AppSidebar.tsx` | Add Activity to member nav |

---

## Execution Order

1. Update `src/types/index.ts` - Add user_email field
2. Update `src/hooks/useWorkflowExecutions.ts` - Edge Function + user email
3. Update `src/components/templates/ExecuteTemplateDialog.tsx` - Better feedback
4. Update `src/pages/ExecutionHistory.tsx` - "Run By" column + filter
5. Create `src/components/member/QuickActions.tsx` - Member template cards
6. Create `src/components/member/RecentActivity.tsx` - Recent activity list
7. Update `src/pages/MemberDashboard.tsx` - Integrate new sections
8. Update `src/components/layout/AppSidebar.tsx` - Add Activity link for members

---

## Technical Notes

### Edge Function Call Pattern
```typescript
const { data, error } = await supabase.functions.invoke('execute-workflow', {
  body: {
    template_id: templateId,
    input_params: inputParams
  }
});

// Response: { success, execution_id, status, result, execution_time_ms }
```

### User Email Join Query
```typescript
.select(`
  *,
  workflow_templates (id, name, description, category, icon),
  user_profiles!workflow_executions_user_id_fkey (email)
`)
```

### Member Quick Actions Layout
The Quick Actions section will display as a horizontal row of compact cards above the existing tasks grid, with Recent Activity shown as a compact list below it.
