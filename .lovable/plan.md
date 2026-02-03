

# Add Inactive Boards Section to Board Configuration Page

## Overview

Add a collapsible "Boards from Other Accounts" section at the bottom of the Board Configuration page that displays board configs from different Monday.com accounts. These boards will be shown in a read-only, grayed-out state to help users track all their configurations across multiple accounts.

---

## Changes Summary

| File | Changes |
|------|---------|
| `src/hooks/useBoardConfigs.ts` | Add `inactiveConfigs` array and fetch logic for other-account boards |
| `src/pages/BoardConfig.tsx` | Add collapsible section for inactive boards with info tooltip |
| `src/components/boards/InactiveBoardCard.tsx` | New component for displaying read-only inactive board cards |

---

## 1. Update `useBoardConfigs.ts` Hook

### Add `inactiveConfigs` to State and Return Type

```typescript
interface UseBoardConfigsReturn {
  configs: BoardConfigWithAccess[];
  inactiveConfigs: BoardConfigWithAccess[];  // NEW
  isLoading: boolean;
  // ... rest unchanged
}
```

### Fetch Inactive Configs (Two Queries Approach)

After fetching active configs, add a second query for inactive configs:

```typescript
// Fetch inactive configs (different monday_account_id, not null)
let inactiveData: BoardConfigWithAccess[] = [];
if (integration?.monday_account_id) {
  const { data: inactiveConfigsData } = await supabase
    .from("board_configs")
    .select("*")
    .eq("organization_id", organization.id)
    .not("monday_account_id", "is", null)
    .neq("monday_account_id", integration.monday_account_id)
    .order("created_at", { ascending: false });

  if (inactiveConfigsData) {
    inactiveData = inactiveConfigsData.map((config) => ({
      id: config.id,
      organization_id: config.organization_id,
      monday_board_id: config.monday_board_id,
      board_name: config.board_name,
      filter_column_id: config.filter_column_id,
      filter_column_name: config.filter_column_name,
      filter_column_type: config.filter_column_type,
      visible_columns: (config.visible_columns as string[]) || [],
      is_active: config.is_active ?? true,
      monday_account_id: config.monday_account_id,
      created_at: config.created_at,
      updated_at: config.updated_at,
      memberAccess: [], // No need to load member access for inactive
    }));
  }
}
setInactiveConfigs(inactiveData);
```

---

## 2. Create `InactiveBoardCard.tsx` Component

A simplified, read-only version of `BoardConfigCard`:

### Props

```typescript
interface InactiveBoardCardProps {
  config: BoardConfigWithAccess;
}
```

### Key Features

- Grayed out styling (`opacity-50`)
- No edit/delete buttons
- Shows board name with "Other Account" badge
- Tooltip explaining the board belongs to a different account

### Component Structure

```text
┌─────────────────────────────────────────┐
│  [Board Name]              [Other Account] │
│  ────────────────────────────────────── │
│  Filter Column: Person                  │
│  Visible Columns: 5 selected            │
│  Members with Access: 3                 │
│                                          │
│  ℹ️ Connect to this account to manage    │
└─────────────────────────────────────────┘
```

---

## 3. Update `BoardConfig.tsx` Page

### Add State for Collapsible

```typescript
const [inactiveExpanded, setInactiveExpanded] = useState(false);
```

### Add Collapsible Section at Bottom

Only render if `inactiveConfigs.length > 0`:

```text
┌─────────────────────────────────────────────────────────────────┐
│  ▶ Boards from Other Accounts (2)  ⓘ                          │
│     [tooltip: These boards were configured with a different    │
│      Monday.com account. Switch accounts to manage them.]      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Code

```typescript
{inactiveConfigs.length > 0 && (
  <Collapsible open={inactiveExpanded} onOpenChange={setInactiveExpanded}>
    <div className="flex items-center gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="gap-2">
          {inactiveExpanded ? <ChevronDown /> : <ChevronRight />}
          <span>Boards from Other Accounts ({inactiveConfigs.length})</span>
        </Button>
      </CollapsibleTrigger>
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          These boards were configured with a different Monday.com account.
          Switch accounts to manage them.
        </TooltipContent>
      </Tooltip>
    </div>
    <CollapsibleContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 opacity-60">
        {inactiveConfigs.map((config) => (
          <InactiveBoardCard key={config.id} config={config} />
        ))}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## Visual Design

### Active vs Inactive Cards Comparison

```text
ACTIVE BOARD CARD                    INACTIVE BOARD CARD
┌────────────────────┐               ┌────────────────────┐
│ [Tasks]  [Active]  │               │ [Tasks] [Other]    │ ← opacity-60
│         [✏️] [🗑️]  │               │                    │ ← no action buttons
├────────────────────┤               ├────────────────────┤
│ Filter: Person     │               │ Filter: Person     │
│ Columns: 5         │               │ Columns: 5         │
│ Members: 3         │               │ Members: 3         │
│                    │               │                    │
│ ▼ Member Mappings  │               │ ℹ️ Connect to      │
└────────────────────┘               │   manage this board│
                                     └────────────────────┘
```

---

## Data Flow

```text
useBoardConfigs hook
        │
        ├── Query 1: Active configs
        │   WHERE (monday_account_id = current OR null)
        │   ──► configs[]
        │
        └── Query 2: Inactive configs
            WHERE monday_account_id NOT NULL
            AND monday_account_id != current
            ──► inactiveConfigs[]

BoardConfig.tsx
        │
        ├── Render configs with BoardConfigCard (editable)
        │
        └── Render inactiveConfigs with InactiveBoardCard (read-only)
            (inside Collapsible, collapsed by default)
```

---

## New Files

### `src/components/boards/InactiveBoardCard.tsx`

Full component with:
- Card styling with `opacity-50` or similar muted appearance
- Badge showing "Other Account" 
- Display of board name, filter column, visible columns count
- Small info text at bottom: "Connect to this Monday.com account to manage this board"
- No action buttons (edit/delete)

---

## Imports to Add

### `BoardConfig.tsx`

```typescript
import { ChevronRight, ChevronDown, Info } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InactiveBoardCard } from "@/components/boards/InactiveBoardCard";
```

---

## Technical Notes

1. **Separate Query**: Inactive configs are fetched separately to keep the logic clean and avoid complex OR conditions
2. **No Member Access**: We skip loading `member_board_access` for inactive configs since they're read-only
3. **Collapsed by Default**: The section is collapsed by default to not clutter the UI
4. **Hidden When Empty**: The entire section is hidden if there are no inactive configs
5. **Workspace Name**: We could enhance this later by storing/displaying the workspace name from the original integration

