

# Add Workspace Names to Board Configurations

## Overview

Improve UX by displaying human-readable workspace names instead of cryptic account IDs in the Board Configuration page. This includes storing the workspace name with each board config and showing the currently connected account in the page header.

---

## Changes Summary

| File | Changes |
|------|---------|
| **Database Migration** | Add `workspace_name TEXT` column to `board_configs` table |
| `src/types/index.ts` | Add `workspace_name` field to `BoardConfig` interface |
| `src/hooks/useBoardConfigs.ts` | Save `workspace_name` when creating configs; include in mapping |
| `src/pages/BoardConfig.tsx` | Display workspace names in inactive section; show connected account in header |

---

## 1. Database Migration

Add a new column to store the workspace name with each board configuration:

```sql
ALTER TABLE public.board_configs 
ADD COLUMN workspace_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.board_configs.workspace_name IS 
  'Monday.com workspace name at the time of board configuration creation';
```

---

## 2. Update Type Definition

### `src/types/index.ts` - BoardConfig Interface

Add the new field to the interface:

```typescript
export interface BoardConfig {
  id: string;
  organization_id: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  filter_column_name: string | null;
  filter_column_type: string | null;
  visible_columns: string[];
  is_active: boolean;
  monday_account_id: string | null;
  workspace_name: string | null;  // NEW FIELD
  created_at: string | null;
  updated_at: string | null;
}
```

---

## 3. Update `useBoardConfigs.ts`

### 3a. Update `mapConfigFields` Helper

Include `workspace_name` in the field mapping:

```typescript
const mapConfigFields = (config: any): Omit<BoardConfigWithAccess, 'memberAccess'> => ({
  // ... existing fields
  monday_account_id: config.monday_account_id || null,
  workspace_name: config.workspace_name || null,  // ADD THIS
  created_at: config.created_at,
  updated_at: config.updated_at,
});
```

### 3b. Update `createConfig` Function

Save the workspace name from the current integration when creating a new board config:

```typescript
const { data: configData, error: configError } = await supabase
  .from("board_configs")
  .insert({
    organization_id: organization.id,
    monday_board_id: input.monday_board_id,
    board_name: input.board_name,
    filter_column_id: input.filter_column_id,
    filter_column_name: input.filter_column_name,
    filter_column_type: input.filter_column_type,
    visible_columns: input.visible_columns,
    monday_account_id: integration?.monday_account_id || null,
    workspace_name: integration?.workspace_name || null,  // ADD THIS
    is_active: true,
  })
  .select()
  .single();
```

---

## 4. Update `BoardConfig.tsx`

### 4a. Import useIntegration Hook

Add the hook import to access current connection info:

```typescript
import { useIntegration } from "@/hooks/useIntegration";
```

### 4b. Add Hook Usage

Inside the component, get the integration data:

```typescript
const { integration } = useIntegration();
```

### 4c. Add "Connected to" Badge in Header

Display the currently connected workspace in the page header:

```typescript
{/* Header */}
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Board Configuration</h1>
    <p className="text-muted-foreground">
      Configure Monday.com boards and member access
    </p>
    {/* Connected workspace indicator */}
    {integration?.workspace_name && (
      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
        <Link className="h-4 w-4 text-[#01cb72]" />
        <span>Connected to:</span>
        <span className="font-medium text-foreground">
          {integration.workspace_name}
        </span>
      </div>
    )}
  </div>
  <Button onClick={() => setAddDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Add Board
  </Button>
</div>
```

### 4d. Update Inactive Boards Grouping Display

Show workspace name instead of account ID in the inactive section:

```typescript
{Object.entries(groupedInactiveConfigs).map(([accountId, configsGroup]) => (
  <div key={accountId} className="space-y-3">
    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      {/* Show workspace name if available, fall back to account ID */}
      {configsGroup[0]?.workspace_name || `Account: ${accountId}`}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
      {configsGroup.map(config => (
        <InactiveBoardCard key={config.id} config={config} />
      ))}
    </div>
  </div>
))}
```

### 4e. Add Link Icon Import

Add the Link icon import for the connected workspace indicator:

```typescript
import { Plus, Loader2, AlertCircle, LayoutGrid, ChevronRight, ChevronDown, Info, Building2, Link } from "lucide-react";
```

---

## Visual Preview

### Header with Connected Workspace

```text
┌────────────────────────────────────────────────────────────┐
│  Board Configuration                        [+ Add Board]  │
│  Configure Monday.com boards and member access             │
│  🔗 Connected to: MondayEase                               │
└────────────────────────────────────────────────────────────┘
```

### Inactive Boards Section with Workspace Names

```text
┌────────────────────────────────────────────────────────────┐
│  ▶ Boards from Other Accounts (2)  ⓘ                      │
├────────────────────────────────────────────────────────────┤
│  🏢 Thewowstudio                                           │
│  ┌──────────────┐                                          │
│  │ Tasks        │  (grayed out)                            │
│  │ Other Account│                                          │
│  └──────────────┘                                          │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```text
When creating board config:
┌─────────────────────────────────┐
│ integration.monday_account_id   │ ──► saved to board_configs.monday_account_id
│ integration.workspace_name      │ ──► saved to board_configs.workspace_name
└─────────────────────────────────┘

When displaying inactive boards:
┌─────────────────────────────────┐
│ config.workspace_name exists?   │
│   YES ──► Show "Thewowstudio"   │
│   NO  ──► Show "Account: 12345" │  (fallback for legacy configs)
└─────────────────────────────────┘
```

---

## Backwards Compatibility

- Existing board configs will have `workspace_name = NULL`
- The UI falls back to displaying the account ID when no workspace name is stored
- New board configs will automatically capture the workspace name from the current integration

